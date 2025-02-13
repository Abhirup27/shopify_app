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

@Injectable()
export class InstallationService {
    private readonly logger = new Logger(InstallationService.name);

    constructor(
        private readonly utilsService: UtilsService,
        private readonly configService: ConfigService,
        private readonly createStoreProvider: CreateStoreProvider,
        private readonly createSuperAdminProvider: CreateSuperAdmin
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

    public getAccessTokenForStore = async (shop: any, code: string): Promise<string| false>  =>
    {
        try {
            const endpoint = `https://${shop}/admin/oauth/access_token`;
            const headers = new AxiosHeaders().set('Content-Type', 'application/json');
            const data =
                {
                'client_id': this.configService.get('shopify_api_key'),
                'client_secret': this.configService.get('shopify_api_secret'),
                'code': code
                }
            
            //const response = await this.utilsService.requestToShopify("post", endpoint, headers, data); //need to change
            const options: ShopifyRequestOptions = { data, url:endpoint, headers };
            const response: ShopifyResponse = await this.utilsService.requestToShopify("post", options);

            if ('statusCode' in response && response.statusCode === 200)
            {

                    // equal to (response.respBody.hasOwnProperty('access_token'))
                if (response.respBody['access_token'] && response.respBody['access_token'] !== null) 
                {
                    console.log(response.respBody)
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
            
            console.log(options.url)

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
    public saveStoreDetails = async (shopDetails: CreateShopDTO, accessToken: string): Promise<boolean> =>
    {
        let result;
        try {
           
            result = await this.createStoreProvider.createStore(shopDetails, accessToken);

            console.log(result)
            //create a new entry with the table_id of the store table and the id of the user in another table
            //assign roles
    
            //return true;
        }
        catch (error)
        {
            
            this.logger.error('error saving store details to database', error);
            return false;
        }

        const createRelation: UserStore | false = await this.createSuperAdmin(result.user.user_id, result.store.table_id);
        if (typeof createRelation == 'boolean')
        {
            return false;
        }
        return true;

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
