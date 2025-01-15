import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosHeaders } from 'axios';
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { ShopifyResponse } from 'src/types/ShopifyResponse';
import { UtilsService } from 'src/utils/providers/utils.service';

@Injectable()
export class InstallationService {

    constructor(private readonly utilsService: UtilsService, private readonly configService: ConfigService)
    { }
    
    public isAccessTokenValid = async (storeDetails: any): Promise<boolean> =>
    {
        try {
            if (storeDetails.access_token == undefined || storeDetails.access_token == '')
            {
                throw new Error(`Access token for the store ${storeDetails.name} is not present`);
                
            }
            const response = this.utilsService
        }
        catch (error)
        {
            //log
            return false;
        }
    }  

    //need to rewrite this
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

            if (response.hasOwnProperty('statusCode') && response.statusCode === 200)
            {
                //console.log(response.respBody)
                if (response.respBody instanceof Array)
                {
                    // equal to (response.respBody.hasOwnProperty('access_token'))
                    if ('access_token' in response.respBody && response.respBody.access_token !== null) 
                    {

                        /**
                        * this conversion is done because response.respBody.access_token is unknown during compile time 
                        * and the function has to return a string. I might change the definition of ShopifyResponse or set respBody = access_token
                        */
                        const access_token: string = response.respBody.access_token.toString();
                        return access_token;
                    }
                    return false;
                }
                else
                {
                    console.log('this ran')
                    return response.respBody['access_token'];
                }
            }
            return false;
        }
        catch (error)
        {
            //log
            console.error(error);
            return false;
        }
    }

    public getShopDetailsFromShopify = async (shop_domain: any, accessToken: string): Promise<any> =>
    {
        try {
            const options: ShopifyRequestOptions = {url: null, headers:null };
            options.url = this.utilsService.getShopifyStoreURL('shop.json', shop_domain);

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
                //log the error using Logger modules or custom class

               // console.error('Error when fetching shop details \n', shopDetails.statusCode, shopDetails.respBody)
                return null;
            }
        }
        catch (error)
        {
            console.error('Error in fetching shop details from shopify. \n', error.message);
            return null;
        }
    }

    /**
     * Saves store details to the database, in store_table.
     */
    public saveStoreDetails = async (shopDetails: any, accessToken: string): Promise<boolean> =>
    {
        try {
            const payload = {
                'access_token': accessToken,
                'myshopify_domain': shopDetails['myshopify_domain'],
                'id': parseInt(shopDetails['id'], 10),
                'email': shopDetails['email'],
                'name': shopDetails['name'],
                'phone': shopDetails['phone'],
                'address1': shopDetails['address1'],
                'address2': shopDetails['address2'],
                'zip': shopDetails['zip']
            };

            
            return true;
        }
        catch (error)
        {
            //log
            console.error('error saving store details to aatabase \n', error.message);
            return false;
        }
    }

}
