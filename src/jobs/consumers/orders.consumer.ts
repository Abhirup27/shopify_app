import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/database/entities/order.entity';
import { Repository } from 'typeorm';
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { ShopifyResponse } from 'src/types/ShopifyResponse';

interface Money {
  amount: string;
  currencyCode: string;
}

interface MoneySet {
  presentmentMoney: Money;
  shopMoney: Money;
}

interface Image {
  id: string;
  altText?: string;
  url: string;
  width?: number;
}

interface Product {
  id: string;
  productType: string;
  title: string;
  vendor: string;
  updatedAt: string;
  tags: string[];
  publishedAt: string;
  handle: string;
  descriptionHtml: string;
  description: string;
  createdAt: string;
}

interface Variant {
  barcode: string;
  compareAtPrice: string;
  createdAt: string;
  displayName: string;
  id: string;
  image: Image;
  inventoryQuantity: number;
  price: string;
  title: string;
  updatedAt: string;
}

interface TaxLine {
  priceSet: MoneySet;
  rate: number;
  ratePercentage: number;
  title: string;
}

interface Address {
  address1: string;
  address2?: string;
  city: string;
  country: string;
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  zip: string;
}

interface Customer {
  canDelete: boolean;
  createdAt: string;
  displayName: string;
  email: string;
  firstName: string;
  hasTimelineComment: boolean;
  locale: string;
  note?: string;
  updatedAt: string;
  id: string;
  lastName: string;
}

interface TrackingInfo {
  company: string;
  number: string;
  url: string;
}

interface Fulfillment {
  id: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  displayStatus: string;
  estimatedDeliveryAt?: string;
  legacyResourceId: string;
  name: string;
  status: string;
  trackingInfo: TrackingInfo;
}

interface ShippingLine {
  carrierIdentifier: string;
  id: string;
  title: string;
  custom: boolean;
  code: string;
  phone: string;
  originalPriceSet: MoneySet;
  source: string;
  shippingRateHandle: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;
}

type OrderJobNames = typeof JOB_TYPES.SYNC_ORDERS | typeof JOB_TYPES.GET_ORDERS | typeof JOB_TYPES.GET_ORDER;
type OrderJobs = {
  [K in OrderJobNames]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[OrderJobNames];

@Processor(QUEUES.ORDERS, { concurrency: 10 })
export class OrdersConsumer extends WorkerHost {
  private readonly logger = new Logger(OrdersConsumer.name);

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

          return await this.syncOrders(job.data);

        case JOB_TYPES.GET_ORDERS:
          return await this.retrieveOrders(job.data);
        case JOB_TYPES.GET_ORDER:
          return await this.retrieveOrder(job.data);
        default:
          throw new Error('Invalid job name');
      }
    } catch (error) {
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
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_ORDERS]['result']> => {
    const store = data.store;
    try {
      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyURLForStore('graphql.json', store),
        headers: this.utilsService.getGraphQLHeadersForStore(store),
      };
      //const headers: AxiosHeaders = this.utilsService.getGraphQLHeadersForStore(store);
      let cursor: string | null = null;

      do {
        options.data = this.getQueryObjectForOrders(cursor);
        const response: ShopifyResponse = await this.utilsService.requestToShopify('post', options);
        if (response.statusCode == 401) {
          // job.moveToFailed(Error('401'), job.token)
          //job.moveToCompleted(Error('401'), job.token);
          //job.remove()
          throw Error('401');
        }
        console.log(response.respBody);
        //throw Error('401');
        if (response.statusCode == 200) {
          //console.log(response.respBody["data"]['orders']['edges']);
          await this.saveOrdersInDB(store.table_id, response.respBody['data']['orders']['edges']);
        }
        console.log(response);
        // console.log(response.respBody["data"]['orders']['edges']);
        // await this.saveOrdersInDB(store.table_id, response.respBody["data"]['orders']['edges']);
        //console.log(response.respBody);
        cursor = this.getCursorFromResponse(response.respBody['data']['orders']['pageInfo']);
      } while (cursor !== null);
    } catch (error) {
      this.logger.error(error.message, this.syncOrders.name);
      throw error;
    }
    return true;
  };
  /**
   *need to change the code such that it updates existing users. Right now it doesn't update the table even if one of the orders from the response(the arguements to this func) already exist in DB.
   * */
  private async saveOrdersInDB(storeId: number, orders: any[]): Promise<void> {
    try {
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return;
      }

      const formattedOrders = orders.map(order => {
        const node = order.node;
        //console.log(node.fulfillments);
        return {
          email: node.email,
          name: node.name,
          processed_at: node.processedAt,
          taxes_included: node.taxesIncluded,
          id: this.extractIdFromGraphQLId(node.legacyResourceId),
          financial_status: node.displayFinancialStatus,
          closed_at: node.closedAt,
          cancel_reason: node.cancelReason,
          cancelled_at: node.cancelledAt,
          created_at: node.createdAt,
          updated_at: node.updatedAt,
          tags: Array.isArray(node.tags) ? JSON.stringify(node.tags) : node.tags,
          phone: node.phone,
          store_id: storeId,
          line_items: this.formatLineItems(node.lineItems),
          shipping_address: this.formatAddress(node.shippingAddress),
          billing_address: this.formatAddress(node.billingAddress),
          fulfillments: node.fulfillments,
          ship_country: node.shippingAddress?.country || null,
          ship_province: node.shippingAddress?.province || null,
          quantity: node.subtotalLineItemsQuantity,
          total_price: node.totalPriceSet.shopMoney.amount,
          subtotal_price: node.subtotalPriceSet.shopMoney.amount,
          total_discounts: node.totalDiscountsSet.shopMoney.amount,
          customer: node.customer,
        };
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
      const query = this.ordersRepository.create(formattedOrders);
      const result: Order[] = await this.ordersRepository.save(query);
    } catch (error) {
      this.logger.error(`Failed to save orders: ${error.message}`, error.stack);
      throw error;
    }
  }
  private formatLineItems(lineItems: any): string {
    try {
      if (!lineItems?.edges) {
        return null;
      }

      const formattedItems = lineItems.edges.map(({ node: item }) => ({
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

  private formatAddress(address: any): string {
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

  public getQueryObjectForOrders = (cursor: string | null): { query: string } | null => {
    try {
      const filter = `(first: 5${cursor ? `, after: "${cursor}"` : ''})`;

      const query = `{
            orders${filter} {
                edges {
                node {
                    id
                    email
                    name
                    processedAt
                    registeredSourceUrl
                    taxesIncluded
                    legacyResourceId
                    fulfillable
                    customerLocale
                    phone
                    displayFinancialStatus
                    confirmed
                    closed
                    closedAt
                    cancelReason
                    cancelledAt
                    createdAt
                    updatedAt
                    tags
                    totalPriceSet {
                        presentmentMoney {
                            amount
                            currencyCode
                        }
                        shopMoney {
                            amount
                            currencyCode
                        }
                    }
                    subtotalPriceSet  {
                        presentmentMoney {
                            amount
                            currencyCode
                        }
                        shopMoney {
                            amount
                            currencyCode
                        }
                    }
                    totalDiscountsSet  {
                        presentmentMoney {
                            amount
                            currencyCode
                        }
                        shopMoney {
                            amount
                            currencyCode
                        }
                    }
                    subtotalLineItemsQuantity
                    lineItems(first: 20) {
                    edges {
                        node {
                        id
                        image {
                            id
                            altText
                            url
                            width
                        }
                        name
                        nonFulfillableQuantity
                        originalTotalSet {
                            presentmentMoney {
                            amount
                            currencyCode
                            }
                            shopMoney {
                            amount
                            currencyCode
                            }
                        }
                        product {
                            id
                            productType
                            title
                            vendor
                            updatedAt
                            tags
                            publishedAt
                            handle
                            descriptionHtml
                            description
                            createdAt
                        }
                        quantity
                        sku
                        taxLines {
                            priceSet {
                            presentmentMoney {
                                amount
                                currencyCode
                            }
                            shopMoney {
                                amount
                                currencyCode
                            }
                            }
                            rate
                            ratePercentage
                            title
                        }
                        taxable
                        title
                        unfulfilledQuantity
                        variantTitle
                        variant {
                            barcode
                            compareAtPrice
                            createdAt
                            displayName
                            id
                            image {
                            id
                            altText
                            url
                            width
                            }
                            inventoryQuantity
                            price
                            title
                            updatedAt
                        }
                        vendor
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                        hasPreviousPage
                        startCursor
                    }
                    }
                    
                    fulfillments {
                        createdAt
                        deliveredAt
                        displayStatus
                        estimatedDeliveryAt
                        id
                        inTransitAt
                        legacyResourceId
                        location {
                            id
                            name
                        }
                        name
                        status
                        totalQuantity
                        trackingInfo {
                            company
                            number
                            url
                        }
                    }
                    

                    totalPriceSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                    shopMoney {
                        amount
                        currencyCode
                    }
                    }
                    shippingLine {
                    carrierIdentifier
                    id
                    title
                    custom
                    code
                    phone
                    originalPriceSet {
                        presentmentMoney {
                        amount
                        currencyCode
                        }
                        shopMoney {
                        amount
                        currencyCode
                        }
                    }
                    source
                    shippingRateHandle
                    }
                    shippingAddress {
                    address1
                    address2
                    city
                    country
                    firstName
                    lastName
                    phone
                    province
                    zip
                    }
                    billingAddress {
                    address1
                    address2
                    city
                    country
                    firstName
                    lastName
                    phone
                    province
                    zip
                    }
                    customer {
                    addresses(first :2){
                    address1
                    address2
                    city
                    company
                    country
                    countryCodeV2
                    firstName
                    lastName
                    latitude
                    longitude
                    phone
                    zip
                    }
                    canDelete
                    createdAt
                    displayName
                    email
                    firstName
                    hasTimelineComment
                    locale
                    note
                    updatedAt
                    id
                    lastName
                    }
                    currentSubtotalPriceSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                    shopMoney {
                        amount
                        currencyCode
                    }
                    }
                    currentTaxLines {
                    channelLiable
                    priceSet {
                        presentmentMoney {
                        amount
                        currencyCode
                        }
                        shopMoney {
                        amount
                        currencyCode
                        }
                    }
                    rate
                    ratePercentage
                    title
                    }
                }
                }
                pageInfo {
                hasNextPage
                endCursor
                hasPreviousPage
                startCursor
                }
            }
            }`;

      return { query };
    } catch (error) {
      this.logger.error(error.message, this.getQueryObjectForOrders.name);
      return null;
    }
  };
}
