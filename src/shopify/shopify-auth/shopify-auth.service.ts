import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AxiosHeaders } from 'axios';

import { ShopifyRequestOptions } from 'src/utils/types/ShopifyRequestOptions';
import { ShopifyResponse } from 'src/utils/types/ShopifyResponse';
import { UtilsService } from 'src/utils/utils.service';
import { CreateShopDTO } from './dtos/create-store.dto';
import { CreateStoreProvider } from './providers/create-store.provider';
import { UserStore } from 'src/database/entities/userstore.entity';
import { CreateSuperAdmin } from './providers/create-super-admin';
import { User } from 'src/database/entities/user.entity';
import { Store } from 'src/database/entities/store.entity';
import { JobsService } from 'src/jobs/jobs.service';
import * as crypto from 'crypto';
import { DataService } from '../../data/data.service';
import { print } from 'graphql';
import { GetStoreDetailsDocument, GetStoreDetailsQuery, GetStoreDetailsQueryVariables } from '../../generated/graphql';

@Injectable()
export class ShopifyAuthService {
  private readonly logger = new Logger(ShopifyAuthService.name);


  private readonly storeDetailsQuery: string =  print(GetStoreDetailsDocument);
  constructor(
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    private readonly createStoreProvider: CreateStoreProvider,
    private readonly createSuperAdminProvider: CreateSuperAdmin,
    private readonly dataService: DataService,

  ) {}

  public isAccessTokenValid = async (storeDetails: Store): Promise<boolean> => {
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

  public getOAuthURL = async (clientId: string, shopDomain: string): Promise<string> => {
    const nonce = crypto.randomBytes(16).toString('hex');
    await this.dataService.storeNonce(nonce, shopDomain);

    const scopes: string = this.configService.get('accessScopes');
    const redirect: string = this.configService.get('app_install_URL');

    /**
     * https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
     */
    const url = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirect}&state=${nonce}&grant_options[]=per-user`;

    return url;
  };

  public validateNonce = async (nonce: string, shopDomain: string): Promise<boolean> => {
    return await this.dataService.validateAndRemoveNonce(nonce, shopDomain);
  };
  public getAccessTokenForStore = async (shop: any, code: string): Promise<string | false> => {
    try {
      const endpoint = `https://${shop}/admin/oauth/access_token`;
      const headers = new AxiosHeaders().set('Content-Type', 'application/json');
      const data = {
        client_id: this.configService.get<string>('shopify_api_key'),
        //'scope': this.configService.get('accessScopes'),
        client_secret: this.configService.get<string>('shopify_api_secret'),
        code: code,
      };

      //const response = await this.utilsService.requestToShopify("post", endpoint, headers, data); //need to change
      const options: ShopifyRequestOptions = { data, url: endpoint, headers };
      const response = await this.utilsService.requestToShopify<{ access_token: string }>('post', options);

      if ('statusCode' in response && response.statusCode === 200) {
        //console.log(response.respBody);
        // equal to (response.respBody.hasOwnProperty('access_token'))
        if (
          response.respBody.access_token &&
          response.respBody.access_token !== null &&
          response.respBody.access_token != undefined
        ) {
          console.log(response.respBody);
          return response.respBody.access_token.toString();
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

  
  public getShopDetailsFromShopify = async (shop_domain: string, accessToken: string): Promise<GetStoreDetailsQuery> => {
    try {
      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyStoreURL('graphql.json', shop_domain),
        headers: null,
        data: { query: this.storeDetailsQuery },
      };

      //options.url = this.utilsService.getShopifyStoreURL('shop.json', shop_domain);

      options.headers = new AxiosHeaders()
        .set('Content-Type', 'application/json')
        .set('X-Shopify-Access-Token', accessToken);

      //console.log(options.url)

      const shopDetails = await this.utilsService.requestToShopify<GetStoreDetailsQuery>('post', options);

      if (shopDetails.statusCode === 200 || shopDetails.status === true) {

        return shopDetails.respBody;
      } else {
        //log the error using Logger module or custom class
        this.logger.error(
          `Error fetching shop details for ${shop_domain} Error Code:${shopDetails.statusCode} Response Body:\n ${shopDetails.respBody}`,
        );
        //console.error('Error when fetching shop details \n', shopDetails.statusCode, shopDetails.respBody)
        return null;
      }
    } catch (error) {
      console.error('Error in fetching shop details from shopify. \n', error.message);
      this.logger.error(`Error in sending a request to fetch shop details. \n Error: ${error}`);
      return null;
    }
  };

  /**
   * Saves store details to the database, in store_table. CreateShopDTO has all the key value pairs that the shopify server returns for requesting the shop.json
   */
  public saveStoreDetails = async (
    shopDetails:  GetStoreDetailsQuery['shop'],
    accessToken: string,
  ): Promise<{ table_id: number | null; success: boolean }> => {
    let result: { success?: boolean; user: User; store: Store };
    try {
      const store  = {
        id: parseInt(shopDetails.id.split('/').pop()),
        name: shopDetails.name,
        email: shopDetails.email,
        phone: shopDetails.billingAddress.phone,
        address1: shopDetails.billingAddress.address1,
        address2: shopDetails.billingAddress.address2,
        zip: shopDetails.billingAddress.zip,
        myshopifyDomain: shopDetails.myshopifyDomain,
        country: shopDetails.billingAddress.country,
      };
      result = await this.createStoreProvider.createStore(store, accessToken);

      //console.log(result)
      //create a new entry with the table_id of the store table and the id of the user in another table
      //assign roles

      //return true;
    } catch (error) {
      this.logger.error('error saving store details to database', error);
      return { table_id: null, success: false };
    }


    const createRelation: UserStore | false = await this.createSuperAdmin(result.user.user_id, result.store.table_id);
    //post install tasks
    this.jobsService.syncProducts(result.store);
    this.jobsService.syncOrders(result.store);
    this.jobsService.syncCustomers(result.store);
    this.jobsService.configure(result.store.table_id);
    this.jobsService.activateTrial(result.store, result.user);

    if (typeof createRelation == 'boolean') {
      return { table_id: result.store.table_id, success: false };
    }
    return { table_id: result.store.table_id, success: true };
  };

  public createSuperAdmin = async (userId: number, storeId: number): Promise<UserStore | false> => {
    let result: UserStore | null;
    try {
      result = await this.createSuperAdminProvider.create(userId, storeId);
      if (result == null) {
        throw Error('failed to create entry in database');
      }
    } catch (error) {
      this.logger.error('Error in creating Super Admin: ', error);

      return false;
    }

    return result;
  };

  public updateAccessToken = async (store: number, accessToken: string): Promise<boolean> => {
    return await this.dataService.updateStoreToken(store, accessToken);
  };
}
