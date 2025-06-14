import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { Customer } from 'src/database/entities/customer.entity';
import { Job } from 'bullmq';
import { ShopifyRequestOptions } from 'src/utils/types/ShopifyRequestOptions';
import { ShopifyResponse } from 'src/utils/types/ShopifyResponse';

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;
}

type CustomersJobNames = typeof JOB_TYPES.SYNC_CUSTOMERS | typeof JOB_TYPES.GET_CUSTOMERS;

type CustomerQueueJob = {
  [K in CustomersJobNames]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[CustomersJobNames];
@Processor(QUEUES.CUSTOMERS, { concurrency: 10 })
export class CustomersConsumer extends WorkerHost {
  private readonly logger = new Logger(CustomersConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,

    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {
    super();
  }

  public process = async (job: CustomerQueueJob): Promise<JobRegistry[CustomersJobNames]['result']> => {
    try {
      switch (job.name) {
        case JOB_TYPES.SYNC_CUSTOMERS:
          if (this.isStore(job.data.store)) {
            // job.data instanceof Store
            return await this.syncCustomers(job.data);
          } else {
            throw Error('invalid job data, expected Store');
          }
        case JOB_TYPES.GET_CUSTOMERS:
          return await this.retrieveCustomers(job.data);

        default:
          throw Error('Invalid job');
      }
    } catch (error) {
      this.logger.error(error.message);
      return null;
    }
  };

  private retrieveCustomers = async (
    data: JobRegistry[typeof JOB_TYPES.GET_CUSTOMERS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_CUSTOMERS]['result']> => {
    let customers: Customer[] | Customer;
    try {
      customers = await this.customersRepository.findBy({
        store_id: data.storeId,
      });
    } catch (error) {
      this.logger.error(error.message, '', this.retrieveCustomers.name);
      return null;
    }
    return customers;
  };

  private syncCustomers = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_CUSTOMERS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_CUSTOMERS]['result']> => {
    try {
      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyURLForStore('graphql.json', data.store),
        headers: this.utilsService.getGraphQLHeadersForStore(data.store),
      };

      let cursor: string | null = null;

      do {
        options.data = this.getQueryObjectForCustomers(cursor);
        const response: ShopifyResponse = await this.utilsService.requestToShopify('post', options);

        if (response.statusCode == 200) {
          await this.storeCustomersDB(data.store.table_id, response.respBody['customers']['edges']);
        }

        // console.log(response.respBody['data']['customers']['edges']);
        // await this.saveOrdersInDB(store.table_id, response.respBody["data"]['orders']['edges']);
        //console.log(response.respBody);
        cursor = this.getCursorFromResponse(response.respBody['customers']['pageInfo']);
      } while (cursor !== null);
    } catch (error) {
      this.logger.error(error.message, '', this.syncCustomers.name);
      return null;
    }
  };

  private getCursorFromResponse = (pageInfo: PageInfo): string | null => {
    try {
      return pageInfo.hasNextPage === true ? pageInfo.endCursor : null;
    } catch (error) {
      this.logger.debug(error.message, this.getCursorFromResponse.name);
      return null;
    }
  };

  private storeCustomersDB = async (storeId: number, customers: any): Promise<Customer[] | Customer | null> => {
    let customersCreated: Customer | Customer[];
    try {
      if (!customers || !Array.isArray(customers) || customers.length === 0) {
        return;
      }

      const formattedCustomers = customers.map(node => {
        const customer = node.node;
        //console.log(customer);
        return {
          id: this.extractId(customer.id),
          store_id: storeId,
          email: customer.email,
          first_name: customer.firstName,
          last_name: customer.lastName,
          phone: customer.phone,
          tags: customer.tags.join(','),
          created_at: customer.createdAt,
          updated_at: customer.updatedAt,
          default_address: customer.defaultAddress,
          accepts_marketing: customer.smsMarketingConsent, //+ customer.emailMarketingConsent,

          orders_count: 0,
          currency: 'Rupees',
          admin_graphql_api_id: 'bogus',
        };
      });
      console.log(formattedCustomers);
      customersCreated = this.customersRepository.create(formattedCustomers);
      await this.customersRepository.upsert(formattedCustomers, ['id', 'store_id']);
      /* await this.customersRepository
         .createQueryBuilder()
         .insert()
         .into(Customer)
         .values(formattedCustomers)
         .orUpdate(
           [
             'email',
             'first_name',
             'last_name',
             'created_at',
             'updated_at',
             'tags',
             'phone',
             'default_address',
             'accepts_marketing',
           ],
           ['id', 'store_id'],
         )
         .execute();
     */
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return null;
    }

    return customersCreated;
  };

  private extractId = (gidString: string): number | null => {
    const regex = /gid:\/\/shopify\/\w+\/(\d+)/;
    const match = gidString.match(regex);

    // match contains the entire original string, match[index] contain the groups of numbers
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    return null;
  };
  //type predicate guard
  private isStore = (store: Store | number): store is Store => {
    //typecast
    return (store as Store).table_id !== undefined;
  };

  private getQueryObjectForCustomers = (cursor: string | null): { query: string } | null => {
    try {
      const filter = `(first: 5${cursor ? `, after: "${cursor}"` : ''})`;

      const query = `{
                customers${filter} {
                    edges {
                        node {
                            id
                            email
                            firstName
                            lastName
                            phone
                            tags
                            createdAt
                            updatedAt
                            displayName
                            note
                            verifiedEmail
                            taxExempt
                            defaultAddress {
                                id
                                address1
                                city
                                country
                                phone
                                province
                                zip
                            }
                            metafields(first: 5) {
                                edges {
                                    node {
                                        id
                                        key
                                        value
                                        namespace
                                        description
                                    }
                                }
                            }
                            smsMarketingConsent {
                                marketingState
                                marketingOptInLevel
                                consentUpdatedAt
                            }
                            emailMarketingConsent {
                                marketingState
                                marketingOptInLevel
                                consentUpdatedAt
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
      this.logger.error(error.message, this.getQueryObjectForCustomers.name);
      return null;
    }
  };
}
