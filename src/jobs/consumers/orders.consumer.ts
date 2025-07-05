import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/database/entities/order.entity';
import { Repository } from 'typeorm';
import { ShopifyRequestOptions } from 'src/utils/types/ShopifyRequestOptions';

import { TokenExpiredException } from '../token-expired.exception';
import {
  SyncOrdersDocument,
  SyncOrdersQuery,
  PageInfo,
  LineItemConnection,
  MailingAddress,
} from '../../generated/graphql';
import { print } from 'graphql';




type OrderJobNames = typeof JOB_TYPES.SYNC_ORDERS | typeof JOB_TYPES.GET_ORDERS | typeof JOB_TYPES.GET_ORDER;
type OrderJobs = {
  [K in OrderJobNames]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[OrderJobNames];

@Processor(QUEUES.ORDERS, { concurrency: 10 })
export class OrdersConsumer extends WorkerHost {
  private readonly logger = new Logger(OrdersConsumer.name);
  private readonly syncOrdersQueryString: string = print(SyncOrdersDocument);

  constructor(
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {
    super();
  }

  public process = async (job: OrderJobs): Promise<JobRegistry[OrderJobNames]['result']> => {
    try {
      //const store: Store = job.data;

      switch (job.name) {
        case JOB_TYPES.SYNC_ORDERS:
          if (typeof job.data == 'number') {
            throw new Error('Invalid job data, Store expected recieved number type.');
          }

          return await this.syncOrders(job.data, job);

        case JOB_TYPES.GET_ORDERS:
          return await this.retrieveOrders(job.data);
        case JOB_TYPES.GET_ORDER:
          return await this.retrieveOrder(job.data);
        default:
          throw new Error('Invalid job name');
      }
    } catch (error) {
      await job.moveToFailed(new UnrecoverableError(`401`), job.token);

      if (error.message == '401') {
        console.log('yes');
        // job.moveToCompleted(error, undefined);
        //job.moveToFailed(error, job.token);
      }
      throw error;
    }
  };

  private syncOrders = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_ORDERS]['data'],
    job: Job,
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_ORDERS]['result']> => {
    const store = data.store;
    const options: ShopifyRequestOptions = {
      url: this.utilsService.getShopifyURLForStore('graphql.json', store),
      headers: this.utilsService.getGraphQLHeadersForStore(store),
    };
    //const headers: AxiosHeaders = this.utilsService.getGraphQLHeadersForStore(store);
    let cursor: string | null = null;

    do {
      options.data = this.getQueryObjectForOrders(cursor);
      const response = await this.utilsService.requestToShopify<SyncOrdersQuery>('post', options);
      //console.log(JSON.stringify(response))
      if (response.statusCode == 401) {
        // job.moveToFailed(Error('401'), job.token)
        //job.moveToCompleted(Error('401'), job.token);
        //job.remove()
        console.log('yes');
        throw new TokenExpiredException(`Token expired for ${data.store.table_id}`, {
          shop: data.store.table_id.toString(),
          jobId: job.id,
        });

        //          throw Error('401');
      }
      //throw Error('401');
      if (response.statusCode == 200) {
        console.log('this ran')
        console.log(JSON.stringify(response))
        //console.log(response.respBody["data"]['orders']['edges']);
        await this.saveOrdersInDB(store.table_id, response.respBody);
      }
      //console.log(response.respBody['extensions']['cost']['fields']);
      // console.log(response.respBody["data"]['orders']['edges']);
      // await this.saveOrdersInDB(store.table_id, response.respBody["data"]['orders']['edges']);
      //console.log(response.respBody);
      cursor = this.getCursorFromResponse(response.respBody.orders.pageInfo);
    } while (cursor !== null);
    return true;
  };
  /**
   *need to change the code such that it updates existing users. Right now it doesn't update the table even if one of the orders from the response(the arguements to this func) already exist in DB.
   * */
  private async saveOrdersInDB(storeId: number, orders: SyncOrdersQuery): Promise<void> {
    try {
      if (!orders || !Array.isArray(orders.orders.edges) || orders.orders.edges.length === 0) {
        return;
      }

      //need to remove creating Date objects and JSON
      const formattedOrders = orders.orders.edges.map(order => {
        const node = order.node;
        console.log(node);
        //console.log(node.fulfillments);
        const orderFormatted: Order = {
          email: node.email,
          name: node.name,
          processed_at: new Date(node.processedAt),
          taxes_included: node.taxesIncluded,
          id: this.extractIdFromGraphQLId(node.legacyResourceId),
          financial_status: node.displayFinancialStatus,
          closed_at: new Date(node.closedAt),
          cancel_reason: node.cancelReason,
          cancelled_at: new Date(node.cancelledAt),
          created_at: new Date(node.createdAt),
          updated_at: new Date(node.updatedAt),
          tags: Array.isArray(node.tags) ? JSON.stringify(node.tags) : node.tags,
          phone: node.phone,
          store_id: storeId,
          line_items: this.formatLineItems(node.lineItems as LineItemConnection),
          shipping_address: this.formatAddress(node.shippingAddress),
          billing_address: this.formatAddress(node.billingAddress),
          fulfillments: JSON.stringify(node.fulfillments),
          //fulfillment_status: node.fulfillments[0].status, //update this later
          ship_country: node.shippingAddress?.country || null,
          ship_province: node.shippingAddress?.province || null,
          quantity: node.subtotalLineItemsQuantity,
          total_price: node.totalPriceSet.shopMoney.amount,
          subtotal_price: node.subtotalPriceSet.shopMoney.amount,
          total_discounts: node.totalDiscountsSet.shopMoney.amount,
          customer: JSON.stringify(node.customer),
        };
        return orderFormatted;
      });

      // Using TypeORM's upsert functionality
      /**await this.ordersRepository
        .createQueryBuilder()
        .insert()
        .into(Order)
        .values(formattedOrders)
        .orUpdate(
          [
            'email',
            'name',
            'processed_at',
            'taxes_included',
            'financial_status',
            'closed_at',
            'cancel_reason',
            'cancelled_at',
            'updated_at',
            'tags',
            'phone',
            'line_items',
            'shipping_address',
            'billing_address',
            'fulfillments',
            'ship_country',
            'ship_province',
          ],
          ['id', 'store_id'],
        )
        .execute(); 
      */
      console.log(formattedOrders)
      const query = this.ordersRepository.create(formattedOrders);
      await this.ordersRepository.upsert(query, ['id']);
    } catch (error) {
      this.logger.error(`Failed to save orders: ${error.message}`, error.stack);
      throw error;
    }
  }
  private formatLineItems(order: LineItemConnection): string {
    try {
      if (!order?.edges) {
        return null;
      }

      const formattedItems = order.edges.map(({ node: item }) => ({
        id: this.extractIdFromGraphQLId(item.id, 'LineItem'),
        admin_graphql_api_id: item.id,
        fulfillable_quantity: item.unfulfilledQuantity,
        name: item.title,
        variant_title: item.variantTitle,
        vendor: item.vendor,
        sku: item.sku,
        quantity: item.quantity,
        price: item.variant?.price,
        price_set: item.originalTotalSet,
        product_id: this.extractIdFromGraphQLId(item.product?.id, 'Product'),
        variant_id: this.extractIdFromGraphQLId(item.variant?.id, 'ProductVariant'),
        //variant_title: item.variant?.title
      }));

      return JSON.stringify(formattedItems);
    } catch (error) {
      this.logger.error(`Failed to format line items: ${error.message}`);
      return null;
    }
  }

  private formatAddress(address: Partial<MailingAddress>): string {
    try {
      if (!address) {
        return null;
      }

      const formattedAddress = {
        first_name: address.firstName,
        address1: address.address1,
        phone: address.phone,
        city: address.city,
        zip: address.zip,
        province: address.province,
        country: address.country,
        last_name: address.lastName,
        address2: address.address2,
        name: `${address.firstName} ${address.lastName}`,
      };

      return JSON.stringify(formattedAddress);
    } catch (error) {
      this.logger.error(`Failed to format address: ${error.message}`);
      return null;
    }
  }

  private extractIdFromGraphQLId(graphqlId: string, prefix?: string): number | null {
    try {
      if (!graphqlId) {
        return null;
      }

      const idPart = prefix ? graphqlId.replace(`gid://shopify/${prefix}/`, '') : graphqlId;

      return parseInt(idPart, 10);
    } catch (error) {
      this.logger.error(`Failed to extract ID from ${graphqlId}: ${error.message}`, this.extractIdFromGraphQLId.name);
      return null;
    }
  }
  public getCursorFromResponse = (pageInfo: PageInfo): string | null => {
    try {
      return pageInfo.hasNextPage === true ? pageInfo.endCursor : null;
    } catch (error) {
      this.logger.debug(error.message, this.getCursorFromResponse.name);
      return null;
    }
  };

  private retrieveOrders = async (
    data: JobRegistry[typeof JOB_TYPES.GET_ORDERS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_ORDERS]['result']> => {
    const store = data.storeId;
    let orders: Order[];
    try {
      orders = await this.ordersRepository.findBy({
        store_id: store,
      });

      return orders || null;
    } catch (error) {
      this.logger.error(error.message, this.retrieveOrders.name);
      return null;
    }
  };
  private retrieveOrder = async (
    data: JobRegistry[typeof JOB_TYPES.GET_ORDER]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_ORDER]['result']> => {
    const orderId = data.orderId;
    let order: Order | null = null;
    try {
      order = await this.ordersRepository.findOneBy({ id: orderId });
    } catch (error) {
      this.logger.error(error.message, this.retrieveOrder.name);
    }
    return order;
  };

  public getQueryObjectForOrders = (cursor: string | null) => {
    try {

      return {
        query: this.syncOrdersQueryString,
        variables: { cursor },
      };
    } catch (error) {
      this.logger.error(error.message, error.stack,this.getQueryObjectForOrders.name);
      return null;
    }
  };
}
