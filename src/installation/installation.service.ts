import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AxiosHeaders } from 'axios';

import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { ShopifyResponse } from 'src/types/ShopifyResponse';
import { UtilsService } from 'src/utils/utils.service';
import { Repository } from 'typeorm';
import { CreateShopDTO } from './dtos/create-store.dto';
import { CreateStoreProvider } from './providers/create-store.provider';
import { UserStore } from 'src/entities/userstore.entity';
import { CreateSuperAdmin } from './providers/create-super-admin';
import { User } from 'src/entities/user.entity';
import { Store } from 'src/entities/store.entity';
import { JobsService } from 'src/jobs/jobs.service';
import { NonceProvider } from './providers/nonce.provider';
import * as crypto from 'crypto';
@Injectable()
export class InstallationService {
    private readonly logger = new Logger(InstallationService.name);

    constructor(
        private readonly utilsService: UtilsService,
        private readonly configService: ConfigService,
        private readonly jobsService: JobsService,
        private readonly createStoreProvider: CreateStoreProvider,
        private readonly createSuperAdminProvider: CreateSuperAdmin,
        private readonly nonceProvider: NonceProvider
        /**
         * Injecting StoreRepository and UserRepository
         */
        // @InjectRepository(Store)
        // private storesRepository: Repository<Store>,
        // @InjectRepository(User)
        // private usersRepository:Repository<User>
    
    )
    { }
    
    public isAccessTokenValid = async (storeDetails: any): Promise<boolean> =>
    {
        try {
            if ('access_token' in storeDetails || storeDetails.access_token.length > 0)
            {

                const endpoint = this.utilsService.getShopifyStoreURL('shop.json', storeDetails);
                const headers = new AxiosHeaders().set('Content-Type', 'application/json').set('X-Shopify-Access-Token', storeDetails.access_token);
                const options: ShopifyRequestOptions = { url: endpoint, headers: headers };
                
                const response: ShopifyResponse = await this.utilsService.requestToShopify('get', options);

                return (response.statusCode === 200) ? true : false;

            }
            throw new Error(`Access token for the store ${storeDetails.name} is not present`);

        }
        catch (error)
        {
            //log
            this.logger.error(`Failed to verify access token for the Shopify store. \n ${error}`);
            return false;
        }
    }  

    public getOAuthURL = async (clientId: string, shopDomain: string): Promise<string> =>
    {
        // generate nonce, store it in redis, read scopes and the redirect URL from the config.
        
        const nonce = crypto.randomBytes(16).toString('hex');
        await this.nonceProvider.storeNonce(nonce, shopDomain);
        
        const scopes: string = this.configService.get('accessScopes');
        const redirect: string = this.configService.get('app_install_URL');

        /**
         * https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
         */
        const url = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirect}&state=${nonce}&grant_options[]=per-user`

        //return the OAuth URL the startInstallation() function and res.redirect with a 3xx code

        return url;
    }

    public validateNonce = async (nonce:string , shopDomain:string): Promise<boolean> =>
    {
        return await this.nonceProvider.validateAndRemoveNonce(nonce, shopDomain);
    }
    public getAccessTokenForStore = async (shop: any, code: string): Promise<string| false>  =>
    {
        try {
            const endpoint = `https://${shop}/admin/oauth/access_token`;
            const headers = new AxiosHeaders().set('Content-Type', 'application/json');
            const data =
                {
                'client_id': this.configService.get('shopify_api_key'),
                //'scope': this.configService.get('accessScopes'),
                'client_secret': this.configService.get('shopify_api_secret'),
                'code': code
                }
            
            //const response = await this.utilsService.requestToShopify("post", endpoint, headers, data); //need to change
            const options: ShopifyRequestOptions = { data, url:endpoint, headers };
            const response: ShopifyResponse = await this.utilsService.requestToShopify("post", options);

            if ('statusCode' in response && response.statusCode === 200)
            {

                //console.log(response.respBody);
                    // equal to (response.respBody.hasOwnProperty('access_token'))
                if (response.respBody['access_token'] && response.respBody['access_token'] !== null) 
                {
                    //console.log(response.respBody)
                    return response.respBody['access_token'].toString();
                }
                
                this.logger.error(`Failed to retrieve access token from Shopify for ${shop} : ${response}`);
                return false;
            }
        
            this.logger.error(`Failed to retrieve access token from Shopify for ${shop} : ${response}`);
            return false;
        }
        catch (error)
        {
            //log
            console.error(error);
            this.logger.error(`Error retrieving access token for ${shop}: ${error.message}`);
            return false;
        }
    }

    public getShopDetailsFromShopify = async (shop_domain: any, accessToken: string): Promise<any> =>
    {
        try {
            const options: ShopifyRequestOptions = { url: null, headers: null };

            options.url = this.utilsService.getShopifyStoreURL('shop.json',  {myshopify_domain: shop_domain});

            options.headers = new AxiosHeaders().set('Content-Type', 'application/json').set('X-Shopify-Access-Token', accessToken);
            
            //console.log(options.url)

            const shopDetails: ShopifyResponse = await this.utilsService.requestToShopify('get', options);

            //console.log(shopDetails.respBody, '\n')
            if (shopDetails.statusCode === 200 || shopDetails.status === true)
            {
                // log storeDetails.respBody
                return shopDetails.respBody;
            }
            else
            {
                //log the error using Logger module or custom class
               this.logger.error(`Error fetching shop details for ${shop_domain} Error Code:${shopDetails.statusCode} Response Body:\n ${shopDetails.respBody}`);
               //console.error('Error when fetching shop details \n', shopDetails.statusCode, shopDetails.respBody)
                return null;
            }
        }
        catch (error)
        {
            console.error('Error in fetching shop details from shopify. \n', error.message);
            this.logger.error(`Error in sending a request to fetch shop details. \n Error: ${error}`);
            return null;
        }
    }

    /**
     * Saves store details to the database, in store_table. CreateShopDTO has all the key value pairs that the shopify server returns for requesting the shop.json
     */
    public saveStoreDetails = async (shopDetails: CreateShopDTO, accessToken: string): Promise<{table_id: number | null, success: boolean}> =>
    {
        let result: { success?: boolean; user: User; store: Store; };
        try {
           
            result = await this.createStoreProvider.createStore(shopDetails, accessToken);

            //console.log(result)
            //create a new entry with the table_id of the store table and the id of the user in another table
            //assign roles
    
            //return true;
        }
        catch (error)
        {
            
            this.logger.error('error saving store details to database', error);
            return {table_id: null, success: false};
        }

        await this.jobsService.syncProducts(result.store);
        await this.jobsService.syncOrders(result.store);
        await this.jobsService.syncCustomers(result.store);

        const createRelation: UserStore | false = await this.createSuperAdmin(result.user.user_id, result.store.table_id);
        if (typeof createRelation == 'boolean')
        {
            return {table_id: result.store.table_id, success: false};
        }
        return {table_id: result.store.table_id, success: true};

    }


    public createSuperAdmin = async (userId: number, storeId:number): Promise<UserStore | false> =>
    {
        let result: UserStore | null;
        try {
            result = await this.createSuperAdminProvider.create(userId, storeId);
            if (result == null)
            {
                throw Error('failed to create entry in database');
            }
        }
        catch (error)
        {

            this.logger.error('Error in creating Super Admin: ', error);

            return false;
        }

        return result;

    }
}
