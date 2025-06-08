import { ShopifyRequestOptions } from 'src/utils/types/ShopifyRequestOptions';
import { ResponseBodyType, ShopifyResponse } from 'src/utils/types/ShopifyResponse';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosHeaders, AxiosRequestConfig, AxiosResponse, Method, ResponseType } from 'axios';
import { Store } from 'src/database/entities/store.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CsrfProvider } from './providers/csrf.provider';
import { Request, Response } from 'express';
import { GetInstallCodeDto } from 'src/shopify/shopify-auth/dtos/get-code-query.dto';
import { GetInstallInitQueryDto } from 'src/shopify/shopify-auth/dtos/get-install-query.dto';

/**
 * Here all the utility functions are defined. These are used throughout the app.
 * */
@Injectable()
export class UtilsService {
  private readonly logger = new Logger(UtilsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,

    private readonly csrfProvider: CsrfProvider,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {
    //csrfProvider = new CsrfProvider(undefined);
  }
  private isStore = (data: unknown): data is Store => {
    return data instanceof Store || (typeof data === 'object' && data !== null && 'table_id' in data);
  };

  public getStoreByDomain = async (shop: string): Promise<Store> => {
    //console.log(shop);
    console.log(shop);
    const existingStore = await this.storeRepository.findOneBy({
      myshopify_domain: shop,
    });
    //console.log(existingStore);
    console.log('yes');
    return existingStore;
  };
  public getAllStoresByDomain = async (shop: string): Promise<Store[]> => {
    let stores: Store[];
    try {
      stores = await this.storeRepository.findBy({ myshopify_domain: shop });
    } catch (error) {
      this.logger.error(error.message, this.getAllStoresByDomain.name);
    }
    return stores;
  };
  public getShopifyURLForStore(endpoint: string, store: Store): string {
    const shopifyApiVersion = this.configService.get<string>('shopify_api_version');

    return this.checkIfStoreIsPrivate(store)
      ? `https://${store.api_key}:${store.api_secret_key}@${store.myshopify_domain}/admin/api/${shopifyApiVersion}/${endpoint}`
      : `https://${store.myshopify_domain}/admin/api/${shopifyApiVersion}/${endpoint}`;
  }

  public validateRequestFromShopify = async (request: GetInstallCodeDto | GetInstallInitQueryDto): Promise<boolean> => {
    try {
      this.logger.log(`HMAC recieved: ${request.hmac}`);

      const arr: string[] = [];
      const hmac = request.hmac;
      delete request.hmac;

      for (const [key, value] of Object.entries(request)) {
        const encodedKey = key.replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
        const encodedValue = value.replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
        arr.push(`${encodedKey}=${encodedValue}`);
      }
      const str = arr.join('&');
      const crypto = require('crypto');
      const verHmac = crypto
        .createHmac('sha256', this.configService.get('shopify_api_secret'))
        .update(str)
        .digest('hex');
      return verHmac === hmac;
    } catch (error) {
      // Use custom logging
      this.logger.error(error.message, this.validateRequestFromShopify.name);
      return false;
    }
  };

  public checkIfStoreIsPrivate(store: Store): boolean {
    if (
      (store['api_key'] == undefined || store.api_key == null) &&
      (store['api_secret_key'] == undefined || store.api_secret_key == null)
    ) {
      return false;
    }
    return (
      'api_key' in store &&
      'api_secret_key' in store &&
      store.api_key !== null &&
      store.api_secret_key !== null &&
      store.api_key.length > 0 &&
      store.api_secret_key.length > 0
    );
  };

  public getShopifyStoreURL(endpoint: string, myshopify_domain: string): string;
  public getShopifyStoreURL(endpoint: string, store: Store): string;
  public getShopifyStoreURL(endpoint: string, domain_or_store: Store | string): string {

    if (this.isStore(domain_or_store)) {

      const store = domain_or_store;
      return this.checkIfStoreIsPrivate(store)
        ? `https://${store.api_key}:${store.api_secret_key}@${store.myshopify_domain}/admin/api/${this.configService.get('shopify_aoi_version')}/${endpoint}`
        : `https://${store.myshopify_domain}/admin/api/${this.configService.get('shopify_api_version')}/${endpoint}`;
    } else {
      return `https://${domain_or_store}/admin/api/${this.configService.get('shopify_api_version')}/${endpoint}`;
    }
  }

  public getGraphQLHeadersForStore = (store: Store): AxiosHeaders => {
    return this.checkIfStoreIsPrivate(store)
      ? new AxiosHeaders({
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store['api_secret_key'],
          'X-GraphQL-Cost-Include-Fields': true,
        })
      : new AxiosHeaders({
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.access_token,
          'X-GraphQL-Cost-Include-Fields': true,
        });
  };
  public isAppEmbedded = (): boolean => {
    return this.configService.get('shopify_app_embedded');
  };

  /**
   * For reqyests where body/data is not required. ShopifyRequestOptions object type is used.
   * Returns ShopifyResponse
   * @param options data is ommited. Refer to ShopifyRequestOptions and ShopifyResponse.
   * @param method The HTTP request method. This tells the server what action needs to be performed with the specified resource. Valid: get, post, delete, put, patch
   * @returns It returns the entire response. The response body is returned in the type specified during the call to this function. If type T is not specified, then response body is of any type and you get no type safety. Note that you will get errors if the returned response differs in key names.
   * */

  public async requestToShopify<T extends ResponseBodyType>(
    method: 'get' | 'delete',
    options: Omit<ShopifyRequestOptions, 'data'>,
  ): Promise<ShopifyResponse<T>>;

  /**
   * For requests where body/data is required. ShopifyRequestOptions object type is used.
   * Returns ShopifyResponse
   * @param options data is included. Refer to ShopifyRequestOptions and ShopifyResponse.
   * @param method The HTTP request method. This tells the server what action needs to be performed with the specified resource. Valid: get, post, delete, put, patch
   * @returns It returns the entire response. The response body is returned in the type specified during the call to this function. If type T is not specified, then response body is of any type and you get no type safety. Note that you will get errors if the returned response differs in key names.
   * */

  public async requestToShopify<T extends ResponseBodyType>(
    method: 'post' | 'put' | 'patch',
    options: ShopifyRequestOptions,
  ): Promise<ShopifyResponse<T>>;

  /**
   *For requests of all method types. It accepts headers, url/endpoint, payload individually.
   * @param headers The headers for the request. Include the required key value pairs.
   * @param payload The data/body that will be sent with the request. It is dropped if the method is either GET or DELETE.
   * @param endpoint The url endpoint to which the request will be sent.
   * @param method The HTTP request method. This tells the server what action needs to be performed with the specified resource. Valid: get, post, delete, put, patch
   * @returns It returns the entire response. The response body is returned in the type specified during the call to this function. If type T is not specified, then response body is of any type and you get no type safety. Note that you will get errors if the returned response differs in key names.
   */

  public async requestToShopify<T extends ResponseBodyType>(
    method: Method,
    endpoint: string,
    headers: AxiosHeaders,
    payload?: Record<string, any>,
  ): Promise<ShopifyResponse<T>>;

  /**one implementation handles all the overloads
   *
   * */

  public async requestToShopify<T extends ResponseBodyType>(
    method: Method,
    endpointOrOptions: string | ShopifyRequestOptions,
    headers?: AxiosHeaders,
    payload?: Record<string, any>,
  ): Promise<ShopifyResponse<T>> {
    const reqResult: ShopifyResponse<T> = { status: false, respBody: null as T };

    try {
      let response;
      //handle the first two overloads
      if (typeof endpointOrOptions === 'object') {
        const requestConfig: AxiosRequestConfig = { method: method, ...endpointOrOptions };
        response = await firstValueFrom(this.httpService.request(requestConfig));
      }
      // Handle the calls with where the second arguement is not an object, that is, the call includes endpoint, headers, payload as separate values, not an object.
      else {
        response = await firstValueFrom(
          this.httpService.request({
            method,
            url: endpointOrOptions,
            headers,
            ...(payload && { data: payload }),
          }),
        );
      }

      reqResult.status = true;
      reqResult.respBody = response.data as T;
      reqResult.statusCode = response.status;

      if (method === 'post' && typeof endpointOrOptions === 'object' && endpointOrOptions.url?.includes('graphql')) {
        if (response.data.errors) {
          reqResult.graphQLErrors = response.data.errors;
        }
        // Flatten response for GraphQL calls
        reqResult.respBody = response.data.data;
      }
      return reqResult;
    } catch (error) {
      reqResult.error = true;

      if (error.response) {
        reqResult.respBody = error.response.data as T;
        reqResult.statusCode = error.response.status;
      } else {
        reqResult.respBody = error.message;
      }

      return reqResult;
    }
  }

  public getGenerateTokenfunction = (): Function => {
    return this.csrfProvider.getGenerateToken;
  };

  public generateToken = (req: Request, res: Response): string => {
    //const gentoken: Function = this.csrfProvider.getGenerateToken;

    return this.csrfProvider.generateToken(req, res);
  };

}
