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
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { ProductType } from 'src/database/entities/productType.entity';

@Injectable()
export class WebAppService {
  private readonly logger = new Logger(WebAppService.name);
  constructor(
    private readonly routesService: RouteService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
  ) {}

  public async syncProductTypes(store: Store) {
    try {
      //await this.jobsService.syncProductTypes(store);
      await this.jobsService.cacheProductTypes();
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
  public getSuperDashboardPayload = async (user: UserDto): Promise<object> => {
    let dashboard: object = {};

    try {
      const isPublic: boolean = !this.utilsService.checkIfStoreIsPrivate(user.store);
      dashboard = {
        storeId: user.store_id,
        showSidebar: true,
        isSuperAdmin: true,
        isStorePublic: isPublic,
        session: {
          success: '',
        },
        user: {
          name: user.name,
          id: user.user_id,
          permissions: user.permissions,
          can: (permissions: string[]) => user.can(permissions),
          hasRole: (role: string) => user.hasRole(role),
        },
        body: '',
        csrfToken: null,
        appName: 'Shopify App',
        style: '',
        messages: '',
        isEmbedded: false,
      };
    } catch (error) {
      this.logger.error(error.message, this.getSuperDashboardPayload.name);
    }

    return dashboard;
  };

  public getDashboardPayload = async (user: UserDto): Promise<object> => {
    let dashboard: object = {};

    try {
      const recentOrders: Order[] = await this.jobsService.getOrders(user.store_id);
      const customers: Customer[] = await this.jobsService.getCustomers(user.store_id);
      let totalRevenue = 0;
      if (recentOrders && recentOrders.length > 0) {
        totalRevenue = recentOrders.reduce((sum, order) => {
          const orderPrice = parseFloat(order.total_price) || 0;
          return sum + orderPrice;
        }, 0);
      }
      console.log(recentOrders);
      const isPublic: boolean = !this.utilsService.checkIfStoreIsPrivate(user.store);

      dashboard = {
        storeId: user.store_id,
        showSidebar: true,
        isSuperAdmin: false,
        isStorePublic: isPublic,
        session: {
          success: '',
        },
        user: {
          name: user.name,
          id: user.user_id,
          permissions: user.permissions,
          can: (permissions: string[]) => user.can(permissions),
          hasRole: (role: string) => user.hasRole(role),
        },
        body: '',
        csrfToken: null,
        appName: 'Shopify App',
        style: '',
        messages: '',
        isEmbedded: false,
        orders_count: recentOrders.length,
        orders_revenue: totalRevenue,
        customers_count: 3, // customers.length,
        recentSales:
          recentOrders.length > 0
            ? [
                {
                  id: recentOrders[0].id,
                  customer: recentOrders[0].customer['firstName'] + ' ' + recentOrders[0].customer['lastName'],
                  product: recentOrders[0].line_items[0]['name'] + ' , ' + recentOrders[0].line_items[1]['name'],
                  price: recentOrders[0].total_price,
                  status: recentOrders[0].financial_status,
                },
                {
                  id: recentOrders[1].id,
                  customer: recentOrders[1].customer['firstName'] + ' ' + recentOrders[1].customer['lastName'],
                  product: recentOrders[1].line_items[0]['name'],
                  price: recentOrders[1].total_price,
                  status: 'Pending',
                },
                {
                  id: recentOrders[2].id,
                  customer: recentOrders[1].customer['firstName'] + ' ' + recentOrders[1].customer['lastName'],
                  product: 'Headphones',
                  price: recentOrders[2].total_price,
                  status: 'Rejected',
                },
                /* {
id: recentOrders[3].id,
customer: recentOrders[3].customer['firstName'] + ' ' + recentOrders[3].customer['lastName'],
product:
recentOrders[3].line_items[0]['name'] +
' , ' +
recentOrders[3].line_items[1]['name'] +
' , ' +
recentOrders[3].line_items[2]['name'] +
' , ' +
recentOrders[3].line_items[3]['name'],
price: recentOrders[3].total_price,
status: 'Approved',
}, */
              ]
            : '',
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

  public getOrders = async (user: UserDto): Promise<object> => {
    let payload: object = {};
    try {
      payload = {
        storeId: user.store_id,
        orders: await this.jobsService.getOrders(user.store_id),
        isEmbedded: false,
        showSidebar: true,
        isStorePublic: !this.utilsService.checkIfStoreIsPrivate(user.store),
        style: '',
        appName: 'Shopify App',
        user: {
          name: user.name,
          id: user.user_id,
          permissions: user.permissions,
          can: (permissions: string[]) => user.can(permissions),
          hasRole: (role: string) => user.hasRole(role),
        },
        session: {
          success: '',
        },
        body: '',
      };
    } catch (error) {
      this.logger.error(error.message);
    }

    return payload;
  };
  public syncOrders = async (storeId: number, res: Response): Promise<any> => {
    const store: Store = await this.jobsService.getStore(storeId);

    const result = await this.jobsService.syncOrders(store);
    if (typeof result != 'boolean' && result.status && result.status == 'AUTH_REQUIRED') {
      console.log('this is the result:', result.status);
      const url = await this.getOAuthURL(store.myshopify_domain, `/orders?storeId=${store.id}`);
      console.log(url);
      res.redirect(url);
    } else {
      res.redirect(`/orders?storeId=${store.id}`);
    }
  };
  public syncLocations = async (user: UserDto): Promise<StoreLocations[]> => {
    // console.log(user);
    return await this.jobsService.syncStoreLocations(user.store);
  };
  public getOrderDetails = async (user: UserDto, orderId: number): Promise<object> => {
    let payload: object = {};

    try {
      payload = {
        storeId: user.store_id,
        user: user,
        order: await this.jobsService.getOrder(orderId),
        isEmbedded: false,
        showSidebar: true,
        isStorePublic: !this.utilsService.checkIfStoreIsPrivate(user.store),
        style: '',
        appName: 'Shopify App',
      };
    } catch (error) {
      this.logger.error(error.message);
    }

    return payload;
  };
  public syncProducts = async (user: UserDto): Promise<void> => {
    try {
      await this.jobsService.syncProducts(user.store);
    } catch (error) {}
  };
  public getProducts = async (user: UserDto): Promise<object> => {
    let payload: object = {};

    try {
      if (user.hasRole(SUPER_ADMIN) || user.hasRole(ADMIN) || user.can(['read_products'])) {
        const products: Product[] = await this.jobsService.getProducts(user.store_id);
        //console.log(products);
        payload = {
          storeId: user.store_id,
          products: products,
          user: user,
          isEmbedded: false,
          showSidebar: true,
          isStorePublic: !this.utilsService.checkIfStoreIsPrivate(user.store),
          style: '',
          appName: 'Shopify App',
          body: '',
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
      const locations: StoreLocations[] = await this.jobsService.getStoreLocations(user.store_id);
      const level_one_categories: Record<string, string> = await this.jobsService.getProductTypes();
      //console.log(level_one_categories);
      payload = {
        storeId: user.store_id,
        locations: locations,
        user: user,
        isEmbedded: false,
        showSidebar: true,
        isStorePublic: !this.utilsService.checkIfStoreIsPrivate(user.store),
        style: '',
        appName: 'Shopify App',
        body: '',
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
      members = await this.jobsService.getMembers(storeId);
    } catch (error) {
      this.logger.error(error.message, this.getMembers.name);
    }
    return members;
  };
  public createMember = async (newMember: RegisterUserDto, storeId: number): Promise<UserStore> => {
    let newUser: UserStore;
    try {
      newUser = await this.jobsService.createMember(newMember, storeId);
    } catch (error) {
      this.logger.error(error.message, this.createMember.name);
    }
    return newUser;
  };
  private getOAuthURL = async (shopDomain: string, endpoint: string): Promise<string> => {
    const nonce: string = await this.utilsService.createNonce(shopDomain);

    const clientId: string = this.configService.get<string>('shopify_api_key');
    const scopes: string = this.configService.get('accessScopes');
    const redirect: string = this.configService.get('refresh_token_URL'); // + '?endpoint=' + endpoint;

    /**
     * https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
     */
    const url = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirect}&state=${nonce}&grant_options[]=per-user`;

    return url;
  };

  public createProduct = async (user: UserDto, product: newProductDto): Promise<boolean> => {
    console.log(product);
    const result = await this.jobsService.createProduct(user.store, product);

    return true;
  };
}
