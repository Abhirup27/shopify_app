import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { ShopifyResponse } from 'src/types/ShopifyResponse';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExceptionFilter, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosHeaders, AxiosRequestConfig, AxiosResponse, Method } from 'axios';




@Injectable()
export class UtilsService {
    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    )
    {
        
    }

    public getStoreByDomain = async (shop: string): Promise<any> =>
    {
        return null;
    }

    public getShopifyURLForStore = async (endpoint: string, store: any): Promise<any> => {
        const shopifyApiVersion = this.configService.get('shopify_api_version')
        
        return await this.checkIfStoreIsPrivate(store) ? 
            `https://${store.api_key}:${store.api_secret_key}@${store.myshopify_domain}/admin/api/${shopifyApiVersion}/${endpoint}`
            :
            `https://${store.myshopify_domain}/admin/api/${shopifyApiVersion}/${endpoint}`
    }

    
    public validateRequestFromShopify = async(request: Record<string, any>): Promise<boolean> => {
        try {
            const arr: string[] = [];
            const hmac = request.hmac;
            delete request.hmac;

            for (const [key, value] of Object.entries(request)) {
                const encodedKey = key
                    .replace(/%/g, "%25")
                    .replace(/&/g, "%26")
                    .replace(/=/g, "%3D");
                 const encodedValue = value
                    .replace(/%/g, "%25")
                    .replace(/&/g, "%26")
                    .replace(/=/g, "%3D");
                arr.push(`${encodedKey}=${encodedValue}`);
                }

                const str = arr.join("&");
                const crypto = require("crypto");
                const verHmac = crypto
                    .createHmac("sha256", this.configService.get('shopify_api_secret'))
                    .update(str)
                    .digest("hex");

                return verHmac === hmac;
        } catch (error)
        {
            // Use custom logging
            return false;
        }
    }

    public checkIfStoreIsPrivate = (store: any): boolean => {
        if(store['api_key'] == undefined && store['api_secret_key'] == undefined) {return false}
        return ('api_key' in store && 'api_secret_key' in store)
            && (store.api_key !== null && store.api_secret_key !== null)
            && (store.api_key.length > 0 && store.api_secret_key.length > 0);
    }

    public getShopifyStoreURL = (endpoint: string, store: any): string =>
    {
        return this.checkIfStoreIsPrivate(store) ?
            `https://${store.api_key}:${store.api_secret_key}@${store}/admin/api/${this.configService.get('shopify_aoi_version')}/${endpoint}`
            :
            `https://${store}/admin/api/${this.configService.get('shopify_api_version')}/${endpoint}`
    }

    public isAppEmbedded = (): boolean =>
    {
        return this.configService.get('shopify_app_embedded');
    }


    //These first two functions are the other way the function can be called. It can be called like in the PHP code too
    public requestToShopify( method: 'get' | 'delete', options: Omit<ShopifyRequestOptions, 'data'>): Promise<ShopifyResponse>;

    public requestToShopify( method: 'post' | 'put' | 'patch', options: ShopifyRequestOptions): Promise<ShopifyResponse>;

    public requestToShopify(method: Method, endpoint: string, headers: AxiosHeaders, payload?: Record<string, any>): Promise<ShopifyResponse>;

    //one implementation handles all the overloads
    public async requestToShopify(method: Method,
        endpointOrOptions: string | ShopifyRequestOptions, headers?: AxiosHeaders, payload?: Record<string, any> ): Promise<ShopifyResponse>  {
   
        console.log(endpointOrOptions)
        const reqResult: ShopifyResponse = { status: false, respBody: null };

        try {
            let response;
            //handle the first two overloads
            if (typeof endpointOrOptions === 'object') {
                
                const requestConfig: AxiosRequestConfig = { method: method, ...endpointOrOptions }
                response = await firstValueFrom(this.httpService.request(requestConfig));
                
                //const { data, ...requestConfig } = endpointOrOptions;
                // response = await firstValueFrom(
                //     this.httpService.request({
                //         method,
                //         ...requestConfig,
                //         ...(data && { data })
                //     })
                // );
            }
            // Handle the endpoint-based overload
            else {
                response = await firstValueFrom(
                    this.httpService.request({
                        method,
                        url: endpointOrOptions,
                        headers,
                        ...(payload && { data: payload })
                    })
                );
            }

            reqResult.status = true;
            reqResult.respBody = response.data;
            reqResult.statusCode = response.status;
            return reqResult;

        } catch (error) {
            reqResult.error = true;
            
            if (error.response) {
                reqResult.respBody = error.response.data;
                reqResult.statusCode = error.response.status;
            } else {
                reqResult.respBody = error.message;
            }

            return reqResult;
        }
    }

    // public  requestToShopify = async (method: Method, endpoint: string, headers: AxiosHeaders, payload: Record<string, any>): Promise<ShopifyResponse> =>
    // {
    //     //let reqResult: AxiosResponse = null;
    //     const reqResult: ShopifyResponse = { status: false , respBody: null}
    //     const axiosMethod = this.httpService[method];
    //    this.httpService.request
    //     try {
    //         if (!axiosMethod)
    //         {
    //              throw new Error(`Unsupported method: ${method}`);
    //         }

    //         const options = { headers: headers };

    //         if (method.toLowerCase() === 'get' || method.toLowerCase() === 'delete')
    //         {
    //             reqResult.respBody = await axiosMethod(endpoint, options);
    //             reqResult.status = true;
    //         }
    //         else if (['post', 'put', 'patch'].includes(method.toLowerCase()))
    //         {
    //             reqResult.respBody = await axiosMethod(endpoint, payload, options);
    //             reqResult.status = true;
    //         }

    //         return reqResult;
    //     }
    //     catch (error)
    //     {
    //         //reqResult.respBody["error"] = true;
    //         //log to file

    //         reqResult.error = true;
    //         console.log(error.message);

    //         if (error.response)
    //         { 
    //             reqResult.respBody = error.response.data;
    //             reqResult.statusCode = error.response.status;
    //             return reqResult;
    //         }

    //         reqResult.respBody = error.message;
    //         return reqResult;
    //     }
    // }
}
