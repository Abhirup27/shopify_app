import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, RequestTimeoutException, UnauthorizedException, UseFilters } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from 'src/database/entities/customer.entity';
import { Order } from 'src/database/entities/order.entity';
import { Product } from 'src/database/entities/product.entity';
import { ProductType } from 'src/database/entities/productType.entity';
import { ProductVariant } from 'src/database/entities/productVariant.entity';
import { Store } from 'src/database/entities/store.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { Subscription } from 'src/database/entities/subscription.entity';
import { User } from 'src/database/entities/user.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { RequestExceptionFilter } from 'src/filters/timeout.exception.filter';
import { Repository } from 'typeorm';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(UserStore) private readonly userStoreRepository: Repository<UserStore>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ProductType) private readonly productTypeRepository: Repository<ProductType>,
    @InjectRepository(ProductVariant) private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    @InjectRepository(StoreLocations) private readonly storeLocationsRepository: Repository<StoreLocations>,
    @InjectRepository(Subscription) private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  public getStore = async (storeId: number): Promise<Store | null> => {
    try {
      const store: Store = await this.storeRepository.findOne({ where: { table_id: storeId } });
      if (store == null) {
        throw Error('Store not found');
      }
      return store;
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return null;
    }
  };
  public getAllStoresForUser = async (userId: number): Promise<UserStore[]> => {
    const stores: UserStore[] = await this.userStoreRepository.find({
      where: { user_id: userId },
      relations: ['store'],
    });
    return stores;
  };
  public getStoresForUser = async (
    userId: number,
    options: { limit?: number; cursor?: number } = {},
  ): Promise<{ stores: UserStore[]; nextCursor: number | null }> => {
    try {
      const DEFAULT_LIMIT = 10;
      const limit = options.limit || DEFAULT_LIMIT;
      const cursor = options.cursor || 0;

      const query = this.userStoreRepository
        .createQueryBuilder('user_store')
        .where('user_store.user_id = :userId', { userId })
        .andWhere('user_store.store_id > :cursor', { cursor })
        .orderBy('user_store.store_id', 'ASC')
        .take(limit + 1);

      const stores = await query.getMany();

      let nextCursor: number | null = null;
      if (stores.length > limit) {
        nextCursor = stores[limit - 1].store_id;
        stores.splice(limit, 1); //remove the last item.
      }
      return { stores, nextCursor };
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return { stores: [], nextCursor: null };
    }
  };
  public getAllLocationsOfStore = async (storeId: number): Promise<StoreLocations[]> => {
    try {
      return await this.storeLocationsRepository.find({ where: { store_id: storeId } });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return [];
    }
  };
  public getUsersForStore = async (storeId: number): Promise<UserStore[]> => {
    try {
      return await this.userStoreRepository.find({ where: { store_id: storeId }, relations: ['user'] });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  };

  public getAllProductsForStore = async (storeId: number): Promise<Product[]> => {
    try {
      return await this.productRepository.find({ where: { store_id: storeId } });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  };

  public getProductsForStore = async (
    storeId: number,
    options: { limit?: number; cursor?: number } = {},
  ): Promise<{ products: Product[]; nextCursor: number | null }> => {
    try {
      const DEFAULT_LIMIT = 10;
      const limit = options.limit || DEFAULT_LIMIT;
      const cursor = options.cursor || 0;

      const query = this.productRepository
        .createQueryBuilder('product')
        .where('product.store_id = :storeId', { storeId })
        .andWhere('product.id > :cursor', { cursor })
        .orderBy('product.id', 'ASC')
        .take(limit + 1); // Fetch one extra to check for next page

      const products = await query.getMany();

      let nextCursor: number | null = null;
      if (products.length > limit) {
        nextCursor = products[limit - 1].id;
        products.splice(limit, 1); // Remove extra item
      }

      return { products, nextCursor };
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return { products: [], nextCursor: null };
    }
  };
  public getAllOrdersForStore = async (storeId: number): Promise<Order[]> => {
    try {
      return await this.orderRepository.find({ where: { store_id: storeId } });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return [];
    }
  };

  public getOrdersForStore = async (
    storeId: number,
    options: { limit?: number; cursor?: number } = {},
  ): Promise<{ orders: Order[]; nextCursor: number | null }> => {
    try {
      const DEFAULT_LIMIT = 10;
      const limit = options.limit || DEFAULT_LIMIT;
      const cursor = options.cursor || 0;

      const query = this.orderRepository
        .createQueryBuilder('orders')
        .where('orders.store_id = :storeId', { storeId })
        .andWhere('orders.id > :cursor', { cursor })
        .orderBy('orders.id', 'ASC')
        .take(limit + 1); // Fetch one extra to check for next page

      const orders = await query.getMany();
      let nextCursor: number | null = null;
      if (orders.length > limit) {
        nextCursor = orders[limit - 1].id;
        orders.splice(limit, 1); // Remove extra item
      }

      return { orders, nextCursor };
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return { orders: [], nextCursor: null };
    }
  };

  public getAllCustomersForStore = async (storeId: number): Promise<Customer[]> => {
    try {
      return await this.customerRepository.find({ where: { store_id: storeId } });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return [];
    }
  };

  public getCustomersForStore = async (
    storeId: number,
    options: { limit?: number; cursor?: number },
  ): Promise<{ customers: Customer[]; nextCursor: number | null }> => {
    try {
      const DEFAULT_LIMIT = 10;
      const limit = options.limit || DEFAULT_LIMIT;
      const cursor = options.cursor || 0;

      const query = this.customerRepository
        .createQueryBuilder('customer')
        .where('customer.store_id = :storeId', { storeId })
        .andWhere('customer.id > :cursor', { cursor })
        .orderBy('customer.id', 'ASC')
        .take(limit + 1); // Fetch one extra to check for next page

      const customers = await query.getMany();
      let nextCursor: number | null = null;
      if (customers.length > limit) {
        nextCursor = customers[limit - 1].id;
        customers.splice(limit, 1); // Remove extra item
      }

      return { customers, nextCursor };
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return { customers: [], nextCursor: null };
    }
  };

  public getAllVariantsOfProduct = async (productId: number): Promise<ProductVariant[] | null> => {
    try {
      return await this.productVariantRepository.find({ where: { product_id: productId } });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return [];
    }
  };
  public getVariantsOfProduct = async (
    productId: number,
    options: { limit?: number; cursor?: number },
  ): Promise<{ variants: ProductVariant[]; nextCursor: number | null }> => {
    try {
      const DEFAULT_LIMIT = 10;
      const limit = options.limit || DEFAULT_LIMIT;
      const cursor = options.cursor || 0;

      const query = this.productVariantRepository
        .createQueryBuilder('product_variant')
        .where('product_variant.product_id = :productId', { productId })
        .andWhere('product_variant.id > :cursor', { cursor })
        .orderBy('product_variant.id', 'ASC')
        .take(limit + 1); // Fetch one extra to check for next page

      const variants = await query.getMany();
      let nextCursor: number | null = null;
      if (variants.length > limit) {
        nextCursor = variants[limit - 1].id;
        variants.splice(limit, 1); // Remove extra item
      }

      return { variants, nextCursor };
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return { variants: [], nextCursor: null };
    }
  };

  /**
   * This function is specifically used in guards to authorize
   * */
  @UseFilters(RequestExceptionFilter)
  public async findOneByEmail(email: string): Promise<{ User: User; UserStore: UserStore[] }> {
    let user: User | undefined = undefined;
    let userRoles: UserStore[] | undefined = undefined;
    try {
      user = await this.userRepository.findOneBy({
        email: email,
      });
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'failed to fetch the user.',
      });
    }

    if (user == null) {
      this.logger.debug('User not found for the email');
      throw new UnauthorizedException('User does not exist.');
    }

    try {
      userRoles = await this.userStoreRepository.find({
        where: {
          user_id: user.user_id,
        },
      });
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'failed to fetch the user.',
      });
    }

    if (userRoles == null) {
      this.logger.debug('User is not in any stores');
    }

    return { User: user, UserStore: userRoles };
  }

  /**
   * This function is specifically used in guards to authorize
   * */
  @UseFilters(RequestExceptionFilter)
  public async findOneById(userid: number): Promise<{ User: User; UserStore: UserStore[] }> {
    let user: User | undefined = undefined;
    let userRoles: UserStore[] | undefined = undefined;
    try {
      user = await this.userRepository.findOneBy({
        user_id: userid,
      });
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'failed to fetch the user.',
      });
    }

    if (user == null) {
      this.logger.debug('User not found for the email');
      throw new UnauthorizedException('User does not exist.');
    }

    try {
      userRoles = await this.userStoreRepository.find({
        where: {
          user_id: user.user_id,
        },
      });
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'failed to fetch the user.',
      });
    }

    if (userRoles == null) {
      this.logger.debug('User is not in any stores');
    }

    return { User: user, UserStore: userRoles };
  }
  /**
   * This function is specifically used in guards to authorize
   * */
  @UseFilters(RequestExceptionFilter)
  public async findStore(userid: number): Promise<Store> {
    let store: Store;
    try {
      store = await this.storeRepository.findOneBy({
        user_id: userid,
      });
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'failed to fetch store.',
      });
    }
    if (store == null) {
      this.logger.debug('store does not exist.');
    }

    return store;
  }

  public cacheAllProductTypes = async (): Promise<void> => {};
}
