import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { UserDto } from './dtos/user.dto';
import { Order } from 'src/database/entities/order.entity';
import { Customer } from 'src/database/entities/customer.entity';
import { JobsService } from 'src/jobs/jobs.service';
import { Store } from 'src/database/entities/store.entity';
import { RouteService } from './providers/routes.provider';
import { UserStore } from 'src/database/entities/userstore.entity';
import { RegisterUserDto } from './dtos/register-member.dto';
import { ADMIN, SUPER_ADMIN } from 'src/database/entities/constants/user-roles.constants';
import { Product } from 'src/database/entities/product.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import * as crypto from 'crypto';
import { Response } from 'express';
import { newProductDto } from './dtos/new-product.dto';
import { ShopifyRequestOptions } from 'src/utils/types/ShopifyRequestOptions';
import { ProductType } from 'src/database/entities/productType.entity';
import { DataService } from 'src/data/data.service';
import { isArray } from 'class-validator';
import { StorePlan } from '../database/entities/storePlans.entity';

@Injectable()
export class WebAppService {
  private readonly logger = new Logger(WebAppService.name);
  constructor(
    private readonly routesService: RouteService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,

    private readonly dataService: DataService,
  ) {}

  public async syncProductTypes(store: Store) {
    try {
      this.jobsService.syncProductTypes(store);
      //await this.jobsService.cacheProductTypes();
    } catch (error) {
      this.logger.error(error, this.syncProductTypes.name);
    }
  }

  public async getSubCategories(id: string) {
    try {
      return await this.jobsService.getProductTypes('gid://shopify/TaxonomyCategory/' + id);
    } catch (error) {
      this.logger.error(error);
    }
  }
  public getBasePayload(user: UserDto, sidebar: boolean = false):object{
    return {
      appName: 'Shopify App',
      user: user,
      storeId: user.store_id,
      isStorePublic: !user.store.IsPrivate(),
      style:'',
      body: '',
      messages: '',
      showSidebar: sidebar,
      isEmbedded: this.utilsService.isAppEmbedded(),
      session: {
        success: '',
      },

    }
  }
  public getSuperDashboardPayload = async (user: UserDto): Promise<object> => {
    let dashboard: object = {};

    try {
      dashboard = {
        ...this.getBasePayload(user, true),
      };
    } catch (error) {
      this.logger.error(error.message, this.getSuperDashboardPayload.name);
    }

    return dashboard;
  };

  public getDashboardPayload = async (user: UserDto): Promise<object> => {
    let dashboard: object = {};
    try {
      const recentOrders: Order[] = await this.dataService.getAllOrdersForStore(user.store_id);
      const customers: Customer[] = await this.dataService.getAllCustomersForStore(user.store_id);
      let totalRevenue = 0;
      if (recentOrders && recentOrders.length > 0) {
        totalRevenue = recentOrders.reduce((sum, order) => {
          const orderPrice = parseFloat(order.total_price) || 0;
          return sum + orderPrice;
        }, 0);
      }
      const isPublic: boolean = !user.store.IsPrivate();

      const recentSales: any[] = [];
      for (const order of recentOrders) {
        recentSales.push({
          id: order.id,
          customer: order.customer['firstName'] + ' ' + order.customer['lastName'],
          product: order.line_items[0]['name'] + ' , ' + order.line_items[1]['name'],
          price: order.total_price,
          status: order.financial_status,
        });
      }
      dashboard = {
        ...this.getBasePayload(user, true),
        orders_count: recentOrders.length,
        orders_revenue: totalRevenue,
        customers_count: customers.length,
        recentSales: recentOrders.length > 0 ? [...recentSales] : '',
        topSelling: [
          {
            image: '/path/to/laptop-image.jpg',
            name: 'Gaming Laptop',
            price: 1499.99,
            sold: 45,
            revenue: 67499.55,
          },
          {
            image: '/path/to/smartphone-image.jpg',
            name: 'Premium Smartphone',
            price: 999.99,
            sold: 30,
            revenue: 29999.7,
          },
        ],
        activities: [
          {
            time: '1 hour ago',
            status: 'primary',
            content: 'New order received',
          },
          {
            time: '2 hours ago',
            status: 'success',
            content: 'Product shipped',
          },
        ],
        news: [
          {
            image: '/path/to/news-image-1.jpg',
            title: 'Company Milestone Reached',
            excerpt: "We've hit our quarterly sales target early this year!",
          },
          {
            image: '/path/to/news-image-2.jpg',
            title: 'New Product Launch',
            excerpt: 'Introducing our latest innovation next month',
          },
        ],
      };
    } catch (error) {
      this.logger.error(error.message, this.getDashboardPayload.name);
    }

    return dashboard;
  };
  public getStoresPayload = async (user: UserDto): Promise<object> => {
    const allStores: UserStore[] = await this.dataService.getAllStoresForUser(user.user_id);
    //console.log(allStores[0].store.IsPrivate());
    /*const stores: Store[] = allStores.map(userStore => {
      return userStore.store;
    });*/
    return {
      stores: [...allStores],
      ...this.getBasePayload(user),
    };
  };
  public getOrders = async (user: UserDto): Promise<object> => {
    let payload: object = {};
    try {
      payload = {

        orders: await this.dataService.getAllOrdersForStore(user.store_id),
        ...this.getBasePayload(user),
      };
    } catch (error) {
      this.logger.error(error.message);
    }

    return payload;
  };
  public syncOrders = async (storeId: number, res: Response): Promise<any> => {
    const store: Store = await this.dataService.getStore(storeId);

    if (store == null) {
      res.redirect(401, '/dashboard');
      return;
    }
    const result = await this.jobsService.syncOrders(store);
    if (typeof result != 'boolean' && result.status && result.status == 'AUTH_REQUIRED') {
      console.log('this is the result:', result.status);
      const url = await this.getOAuthURL(store.myshopify_domain);
      console.log(url);
      res.redirect(url);
    } else {
      res.redirect(`/orders?storeId=${store.id}`);
    }
  };
  public syncLocations = async (user: UserDto, res: Response): Promise<StoreLocations[] | void> => {
    // console.log(user);
    const result = await this.jobsService.syncStoreLocations(user.store);
    if (result['status'] && result['status'] == 'AUTH_REQUIRED') {
      const url = await this.getOAuthURL(user.store.myshopify_domain);
      //res.setHeader('Access-Control-Allow-Origin', `http://localhost:3000`);
      //res.redirect(url);
      res.status(401).send(url);
      return;
    } else {
      return result as StoreLocations[];
    }
  };
  public getOrderDetails = async (user: UserDto, orderId: number): Promise<object> => {
    let payload: object = {};

    try {
      payload = {
        storeId: user.store_id,
        user: user,
        // order: await this.dataServiceService.getAllOrder(orderId),
        isEmbedded: false,
        showSidebar: true,
        isStorePublic: !user.store.IsPrivate(),
        style: '',
        appName: 'Shopify App',
      };
    } catch (error) {
      this.logger.error(error.message);
    }

    return payload;
  };
  public syncProducts = async (user: UserDto, res: Response): Promise<boolean> => {
    try {
      const result = await this.jobsService.syncProducts(user.store);
      if (result['status'] == 'AUTH_REQUIRED') {
        const url = await this.getOAuthURL(user.store.myshopify_domain);
        console.log(url);
        res.redirect(url);
        return false;
      }
      return true;
    } catch (error) {}
  };
  public getProducts = async (user: UserDto): Promise<object> => {
    let payload: object = {};

    try {
      if (user.hasRole(SUPER_ADMIN) || user.hasRole(ADMIN) || user.can(['read_products'])) {
        const products: Product[] = await this.dataService.getAllProductsForStore(user.store_id);
        //console.log(products);
        payload = {

          products: products,
          ...this.getBasePayload(user),

        };
      }
    } catch (error) {
      this.logger.error(error.message, this.getProducts.name);
    }
    return payload;
  };
  public createProductPagePayload = async (user: UserDto): Promise<object> => {
    let payload: object = {};
    try {
      const locations: StoreLocations[] = await this.dataService.getAllLocationsOfStore(user.store_id);
      const level_one_categories: Record<string, string> = await this.jobsService.getProductTypes();
      console.log(level_one_categories);
      //console.log(level_one_categories);
      payload = {
        ...this.getBasePayload(user),
        locations: locations,
        productTypes: level_one_categories,
      };
    } catch (error) {
      this.logger.error(error.message, this.createProductPagePayload.name);
    }
    return payload;
  };

  public getMembers = async (storeId: number): Promise<UserStore[]> => {
    let members: UserStore[];
    try {
      members = await this.dataService.getUsersForStore(storeId);
    } catch (error) {
      this.logger.error(error.message, this.getMembers.name);
    }
    return members;
  };
  public createMember = async (newMember: RegisterUserDto, storeId: number): Promise<UserStore> => {
    let newUser: UserStore;
    try {
      //replace with a dataService function
      newUser = await this.jobsService.createMember(newMember, storeId);
    } catch (error) {
      this.logger.error(error.message, error.stack,this.createMember.name);
    }
    return newUser;
  };
  private getOAuthURL = async (shopDomain: string): Promise<string> => {
    const nonce: string = await this.dataService.createNonce(shopDomain);

    const clientId: string = this.configService.get<string>('shopify_api_key');
    const scopes: string = this.configService.get('accessScopes');
    const redirect: string = this.configService.get('refresh_token_URL'); // + '?endpoint=' + endpoint;

    /**
     * https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
     */
    const url = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirect}&state=${nonce}&grant_options[]=per-user`;

    return url;
  };

  public createProduct = async (user: UserDto, product: newProductDto): Promise<boolean | {status: string, url: string}> => {
    console.log(product);
    const result = await this.jobsService.createProduct(user.store, product);
    if(result['status'] == 'AUTH_REQUIRED') {
      const url = await this.getOAuthURL(user.store.myshopify_domain);
      return { status: result['status'], url };
    }
    else if(result == false){
      throw Error('unexpected error');
    }
    return true;
  };
  public getBillingPagePayload = async (user: UserDto): Promise<object> => {
    try {
      //call the DataService methods
      const plans = await this.dataService.getPlans();
      const currentPlan: StorePlan = await this.dataService.getCurrentPlan(user.store.id);
      const payload = {
        ...this.getBasePayload(user),
        plans: [...plans],
        last_plan_info: currentPlan,
      };
      return payload;
    } catch (error) {
      this.logger.error(error.message, error.stack, this.getBillingPagePayload.name);
    }
  };

  async buyPlanForStore(user: UserDto, id: number) : Promise<string> {

    return await this.jobsService.buyPlan(id, user.user_id, user.store);
  }
}
