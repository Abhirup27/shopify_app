import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Store } from 'src/database/entities/store.entity';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { Job } from 'bullmq';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { UtilsService } from 'src/utils/utils.service';
import { ShopifyResponse } from 'src/types/ShopifyResponse';
import { AxiosHeaders } from 'axios';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

type StoreJobNames =
  | typeof JOB_TYPES.GET_STORE
  | typeof JOB_TYPES.SYNC_STORE
  | typeof JOB_TYPES.GET_STORE_LOCATIONS
  | typeof JOB_TYPES.SYNC_STORE_LOCATIONS
  | typeof JOB_TYPES.UPDATE_STORE_TOKEN;

type StoreJobs = {
  [K in StoreJobNames]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[StoreJobNames];

@Processor(QUEUES.STORES, { concurrency: 10 })
export class StoresConsumer extends WorkerHost {
  private readonly logger = new Logger(StoresConsumer.name);

  constructor(
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,

    @InjectRepository(StoreLocations)
    private readonly locationsRepository: Repository<StoreLocations>,

    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
  ) {
    super();
  }
  public process = async (job: StoreJobs): Promise<JobRegistry[StoreJobNames]['result']> => {
    try {
      switch (job.name) {
        case JOB_TYPES.GET_STORE:
          return await this.retrieveStore(job.data);
        case JOB_TYPES.SYNC_STORE:
          return await this.syncStore(job.data);
        case JOB_TYPES.GET_STORE_LOCATIONS:
          return await this.retrieveStoreLocations(job.data);
        case JOB_TYPES.SYNC_STORE_LOCATIONS:
          return await this.syncStoreLocations(job.data);
        case JOB_TYPES.UPDATE_STORE_TOKEN:
          return await this.updateStoreToken(job.data);
        default:
          throw new Error('Invalid job');
      }
    } catch (error) {
      this.logger.error(error.message);
      return null;
    }
  };
  /**
  private isJobOfType<T extends keyof JobRegistry>(
    job: Job<JobRegistry[keyof JobTypeMap]['data'], JobTypeMap[keyof JobTypeMap]['result']>,
    name: T,
  ): job is Job<JobTypeMap[T]['data'], JobTypeMap[T]['result']> {
    return job.name === name;
  }
*/
  private retrieveStore = async (
    data: JobRegistry[typeof JOB_TYPES.GET_STORE]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_STORE]['result']> => {
    //let storeId;

    try {
      //typeof job.data === 'number' ? storeId = job.data : null;

      const store: Store = await this.storesRepository.findOneBy({
        table_id: data.storeId,
      });
      if (store !== undefined) {
        return store;
      }
    } catch (error) {
      this.logger.error(error.message, this.retrieveStore.name);
    }

    return null;
  };
  private updateStoreToken = async (
    data: JobRegistry[typeof JOB_TYPES.UPDATE_STORE_TOKEN]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.UPDATE_STORE_TOKEN]['result']> => {
    try {
      const { store, accessToken } = data;
      const storeData = this.isStore(store) ? store : await this.retrieveStore(store);

      if (!storeData) return false;

      const updatedEntry: UpdateResult = await this.storesRepository.update(
        { id: storeData.id },
        { access_token: accessToken },
      );

      return updatedEntry.affected && updatedEntry.affected > 0;
    } catch (error) {
      this.logger.error(error.message, this.updateStoreToken.name);
      return false;
    }
  };
  private syncStore = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_STORE]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_STORE]['result']> => {
    try {
    } catch (error) {
      this.logger.error(error.message, this.syncStore.name);
      return null;
    }
  };
  private retrieveStoreLocations = async (
    data: JobRegistry[typeof JOB_TYPES.GET_STORE_LOCATIONS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_STORE_LOCATIONS]['result']> => {
    try {
      return await this.locationsRepository.findBy({ store_id: data.storeId });
    } catch (error) {
      this.logger.error(error.message, this.retrieveStoreLocations.name);
      return null;
    }
  };

  private syncStoreLocations = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_STORE_LOCATIONS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_STORE_LOCATIONS]['result']> => {
    const locations: StoreLocations[] = [];

    try {
      const store: Store = this.isStore(data.store) ? data.store : await this.retrieveStore({ storeId: data.store });
      // console.log(store, job.data);
      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyURLForStore('graphql.json', store),
        headers: this.utilsService.getGraphQLHeadersForStore(store),
      };

      const cursor: string | null = null;
      do {
        options.data = this.getQueryObjForLocations(cursor);
        const response: ShopifyResponse = await this.utilsService.requestToShopify('post', options);

        console.log(response);
        if (response.statusCode === 200) {
          const result: StoreLocations[] = await this.saveStoreLocations(
            response.respBody['data']['locations']['edges'],
            store.table_id,
          );
          locations.push(...result);
        }
      } while (cursor !== null);
    } catch (error) {
      this.logger.error(error.message, this.syncStoreLocations.name);
    }

    return locations;
  };
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

  private saveStoreLocations = async (locations: object[], storeId: number): Promise<StoreLocations[]> => {
    const returnData: Array<StoreLocations> = [];
    const payload: Array<StoreLocations> = [];
    //console.log(locations[0]);
    for (const data of locations) {
      const loc = data['node'];

      const location = {
        id: this.extractIdFromGraphQLId(loc['id'], 'Location'),
        store_id: storeId,
        name: loc['name'],
        address1: loc['address']['address1'],
        address2: loc['address']['address2'],
        city: loc['address']['city'],
        zip: loc['address']['zip'],
        province: loc['address']['province'],
        country: loc['address']['country'],
        phone: loc['address']['phone'],
        created_at: loc['createdAt'],
        updated_at: loc['updatedAt'],
        country_code: loc['address']['countryCode'],
        province_code: loc['address']['provinceCode'],
        country_name: loc['address']['country'],
        active: loc['isActive'],
        localized_country_name: loc['address']['country'],
        localized_province_name: loc['address']['province'],
      };
      if (await this.locationsRepository.existsBy({ id: location.id })) {
        await this.locationsRepository.update({ id: location.id }, location);

        returnData.push(location as StoreLocations);
        continue;
      }

      //console.log(location);
      payload.push(location as StoreLocations);
    }
    let save = this.locationsRepository.create(payload);
    save = await this.locationsRepository.save(save);
    returnData.push(...save);
    return returnData;
  };
  private isStore = (data: unknown): data is Store => {
    return data instanceof Store || (typeof data === 'object' && data !== null && 'table_id' in data);
  };

  private getQueryObjForLocations = (cursor: string | null): { query: string } | null => {
    let query: string;

    try {
      const filter = `(first: 5${cursor ? `, after: "${cursor}"` : ''}, includeInactive: true, includeLegacy: true)`;

      query = `{

                locations${filter} {
                    edges {
                        node {
                            id
                            name

                            address {
                                formatted
                                address1
                                address2

                                city
                                country
                                countryCode
                                phone
                                province

                                provinceCode
                                zip
                            }
                        createdAt

                        updatedAt
                        isActive

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
    } catch (error) {
      this.logger.error(error.message, this.getQueryObjForLocations.name);
    }
    return { query };
  };

  private isAccessTokenValid = async (storeDetails: Store): Promise<boolean> => {
    try {
      if (storeDetails.access_token.length > 0) {
        const endpoint = this.utilsService.getShopifyStoreURL('shop.json', storeDetails);
        const headers = new AxiosHeaders()
          .set('Content-Type', 'application/json')
          .set('X-Shopify-Access-Token', storeDetails.access_token);
        const options: ShopifyRequestOptions = {
          url: endpoint,
          headers: headers,
        };

        const response: ShopifyResponse = await this.utilsService.requestToShopify('get', options);

        return response.statusCode === 200;
      }
      throw new Error(`Access token for the store ${storeDetails.name} is not present`);
    } catch (error) {
      //log
      this.logger.error(`Failed to verify access token for the Shopify store. \n ${error}`);
      return false;
    }
  };

  private getOAuthURL = async (clientId: string, shopDomain: string): Promise<string> => {
    const nonce = crypto.randomBytes(16).toString('hex');
    //await this.nonceProvider.storeNonce(nonce, shopDomain);

    const scopes: string = this.configService.get('accessScopes');
    const redirect: string = this.configService.get('app_install_URL');

    /**
     * https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
     */
    const url = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirect}&state=${nonce}&grant_options[]=per-user`;

    return url;
  };
  private getAccessTokenForStore = async (shop: any, code: string): Promise<string | false> => {
    try {
      const endpoint = `https://${shop}/admin/oauth/access_token`;
      const headers = new AxiosHeaders().set('Content-Type', 'application/json');

      const data = {
        client_id: this.configService.get('shopify_api_key'),
        //'scope': this.configService.get('accessScopes'),
        client_secret: this.configService.get('shopify_api_secret'),
        code: code,
      };

      //const response = await this.utilsService.requestToShopify("post", endpoint, headers, data); //need to change
      const options: ShopifyRequestOptions = { data, url: endpoint, headers };

      const response: ShopifyResponse = await this.utilsService.requestToShopify('post', options);

      if ('statusCode' in response && response.statusCode === 200) {
        //console.log(response.respBody);
        // equal to (response.respBody.hasOwnProperty('access_token'))
        if (response.respBody['access_token'] && response.respBody['access_token'] !== null) {
          console.log(response.respBody);
          return response.respBody['access_token'].toString();
        }

        this.logger.error(`Failed to retrieve access token from Shopify for ${shop} : ${response}`);
        return false;
      }

      this.logger.error(`Failed to retrieve access token from Shopify for ${shop} : ${response}`);
      return false;
    } catch (error) {
      //log
      console.error(error);

      this.logger.error(`Error retrieving access token for ${shop}: ${error.message}`);
      return false;
    }
  };
}
