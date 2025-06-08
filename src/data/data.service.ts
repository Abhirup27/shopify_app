import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, RequestTimeoutException, UnauthorizedException, UseFilters } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from 'src/database/entities/customer.entity';
import { Order } from 'src/database/entities/order.entity';
import { Plan } from 'src/database/entities/plans.entity';
import { Product } from 'src/database/entities/product.entity';
import { ProductType } from 'src/database/entities/productType.entity';
import { ProductVariant } from 'src/database/entities/productVariant.entity';
import { Store } from 'src/database/entities/store.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { Subscription } from 'src/database/entities/subscription.entity';
import { User } from 'src/database/entities/user.entity';
import { StorePlan } from 'src/database/entities/storePlans.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { RequestExceptionFilter } from 'src/filters/timeout.exception.filter';
import { Repository, UpdateResult } from 'typeorm';
import { CacheService } from './cache/cache.service';
import { randomBytes } from 'crypto';
import { JOB_TYPES, JobRegistry } from '../jobs/constants/jobs.constants';

@Injectable()
export class DataService {

  private readonly logger = new Logger(DataService.name);
  private readonly NONCE_PREFIX = 'shopify:nonce:';
  private readonly NONCE_EXPIRY = '120s';

  constructor(
    //@Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly cacheService: CacheService,

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
    @InjectRepository(Plan) private readonly planRepository: Repository<Plan>,
    @InjectRepository(StorePlan) private readonly storePlanRepository: Repository<StorePlan>,
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

  /**
   * Remember to pass the actual store ID and not the primary incremented ID.
   * */
  public getCurrentPlan = async (storeId: number): Promise<StorePlan> => {
    try{
      return await this.storePlanRepository.findOne({ where: { store_id: storeId } });
    }catch(error){
      this.logger.error(error.message, error.stack);
    }
    return new StorePlan();
  };
  /**
   * Remember to pass the actual store ID and not the primary incremented ID.
   * */
  public setPlan = async (
    planId: number,
    userId: number,
    storeId?: number,
    chargeId?: string,
    chargeDetails?: Record<string, string>,
  ): Promise<StorePlan> => {
    const plans: Plan[] = await this.getPlans();

    const selectedPlan = plans.find(plan => plan.id == planId);
    if (!selectedPlan) {
      throw new Error('Plan not found');
    }

    // Start transaction
    const queryRunner = this.storePlanRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find existing plan with lock to prevent race conditions
      const existingPlan = await queryRunner.manager.findOne(StorePlan, {
        where: { store_id: storeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (existingPlan != null) {
        //This may only happen if there was a store with the given ID existed but got removed, then from the installation service,this setPlan function was called.
        if (selectedPlan.name == 'Trial' || planId == 1) {
          return existingPlan;
        }
        //this.logger.warn(`${existingPlan.last_charge_id}  ${}`);
        // Add credits to existing plan if the new one is not a trial. AND if the new ChargeId doesn't match
        if((chargeId!= undefined && existingPlan.last_charge_id != chargeId)) {
          console.log('execute')
          existingPlan.plan_id = planId;
          existingPlan.price = selectedPlan.price;
          existingPlan.user_id = userId;
          existingPlan.last_charge_id = chargeId;

          if(chargeDetails == undefined || chargeDetails == null){
            existingPlan.status = 'PENDING';
          } else {
            existingPlan.status = chargeDetails.status;
            if(existingPlan.status != 'CANCELLED') {
              existingPlan.credits += selectedPlan.credits;
            }

            let existing_history= existingPlan.charge_history != null ? JSON.parse(existingPlan.charge_history).toArray() : [];
            existing_history.push(chargeDetails);
            existing_history = JSON.stringify(existing_history);
            existingPlan.charge_history = existing_history;
          }
          existingPlan.credits += selectedPlan.credits;
          const updatedPlan = await queryRunner.manager.save(existingPlan);
          await queryRunner.commitTransaction();
          return updatedPlan;
        }
        // this will run if the subscription update webhook calls this function for the specific planId and storeId after billing controller
        if(chargeDetails!= undefined){
          existingPlan.status = chargeDetails.status;
          if(existingPlan.status == 'CANCELLED' && existingPlan.last_charge_id == chargeId){
            existingPlan.credits -= selectedPlan.credits;
            if(existingPlan.credits<0)
            {
              existingPlan.credits = 0;
            }
          }
          let existing_history= existingPlan.charge_history != null ? JSON.parse(existingPlan.charge_history).toArray() : [];
          existing_history.push(chargeDetails);
          existing_history = JSON.stringify(existing_history);
          existingPlan.charge_history = existing_history;
          const updatedPlan = await queryRunner.manager.save(existingPlan);
          await queryRunner.commitTransaction();
          return updatedPlan;
        }
          return existingPlan;


      } else {
        // start trial
        const newPlan = queryRunner.manager.create(StorePlan, {
          store_id: storeId,
          user_id: userId,
          plan_id: planId,
          credits: selectedPlan.credits,
          price: selectedPlan.price,
          status: 'ACTIVE'
        });

        const createdPlan = await queryRunner.manager.save(newPlan);
        await queryRunner.commitTransaction();
        return createdPlan;
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  };
  public getAllPendingSubs = async (chargeIds: string[]): Promise<StorePlan[]> => {
    if (chargeIds.length === 0) return [];

    const records = await this.storePlanRepository
      .createQueryBuilder('store_plan')
      .where("store_plan.status = 'PENDING'")
      .andWhere('store_plan.last_charge_id IN (:...chargeIds)', { chargeIds })
      .getMany();

    return records;

  }
  public getPendingSubs = async () => {
    const pending = await this.cacheService.get<Record<string, string>>('PENDING-SUBSCRIPTIONS');
    if (Object.keys(pending).length > 0) {
      return pending;
    }
    return null;
  };
  public setPendingSubs = async(chargeId: string, attempts: string): Promise<boolean> => {
    const existing = this.getPendingSubs();
    if (existing != null) {
      existing[chargeId] = '0';
      return this.cacheService.set('PENDING-SUBSCRIPTIONS', existing, 0);
    }
    return this.cacheService.set('PENDING-SUBSCRIPTIONS', { chargeId: attempts }, 0);
  };
  public deletePendingSub = async (chargeId: string): Promise<boolean> => {
    const existing = this.getPendingSubs();
    if (existing != null) {
      delete existing[chargeId];
      return this.cacheService.set('PENDING-SUBSCRIPTIONS', existing, 0);
    }
    this.logger.warn('PENDING-SUBSCRIPTIONS empty');
    return false;
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

  public getPlans = async (): Promise<Plan[]> => {
    try {
      const cachedPlans = await this.cacheService.get<Plan[] | undefined>('plans');

      if (cachedPlans == undefined || cachedPlans.length == 0) {
        const plans: Plan[] = await this.planRepository.find();

        await this.cacheService.set('plans', plans, '1h');
        return plans;
      }
      return cachedPlans;
    } catch (error) {
      this.logger.error(error.message, error.stack, this.getPlans.name);
    }
  };

  /**
   *  This function is used to set the full sync status of the product taxonomy in the cache
   *  */
  public setProductCategorySyncStatus = async(status: boolean): Promise<boolean> => {
      return await this.cacheService.set('productCategorySyncStatus', status, 0);
  };
  public getProductCategorySyncStatus = async(): Promise<boolean> => {
    return await this.cacheService.get<boolean>('productCategorySyncStatus');
  };
  public setProductCategoryMap = async (key: string, map: Record<string, string>): Promise<boolean> => {
    return await this.cacheService.set(key, map, 0);
  };
  public getProductCategoryMap = async (key: string): Promise<Record<string, string>> => {
    return await this.cacheService.get<Record<string, string>>(key);
  };
  async getCategoryName(id: string): Promise<string> {
    const parent = id.substring(0, id.lastIndexOf('-'));
    if (parent != '') {
      return await this.cacheService.get<Record<string, string>>(parent).then(value => {
        return value[id];
      });
    } else {
      return await this.cacheService.get<Record<string, string>>('product-types').then(value => {
        return value[id];
      });
    }
  }
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
        relations: ['store'],
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

  public createNonce = async (shopDomain: string): Promise<string> => {
    const nonce = randomBytes(16).toString('hex');

    await this.cacheService.set(`${this.NONCE_PREFIX}${nonce}`, shopDomain, this.NONCE_EXPIRY);
    return nonce;
  };

  public storeNonce = async (nonce: String, shopDomain: string): Promise<void> => {

    await this.cacheService.set(`${this.NONCE_PREFIX}${nonce}`, shopDomain, this.NONCE_EXPIRY);
  };
  public validateAndRemoveNonce = async (nonce: string, shopDomain: string): Promise<boolean> => {
    const key = `${this.NONCE_PREFIX}${nonce}`;
    const storedShopDomain = await this.cacheService.get<string>(key);

    if (storedShopDomain === shopDomain) {
      await this.cacheService.delete(key);
      return true;
    }
    return false;
  };
  /**
   *This function is used to pick one store, it is called by the store context guard.
   *If a storeId is specified in the request query, then it gets passed to this function which then is searched in the DB.
   * */

  public getStoreContext = async (userId: number, storeId?: number): Promise<UserStore> => {
    if (storeId && typeof storeId != undefined) {
      const storeContext = await this.userStoreRepository.findOne({
        where: { user_id: userId, store_id: storeId },
        relations: ['store'],
      });

      if (storeContext) return storeContext;
    }

    // Otherwise get the primary store or the first one
    const storeContexts = await this.userStoreRepository.find({
      where: { user_id: userId },
      order: { store_id: 'DESC' }, // Primary stores first
      relations: ['store'],
    });

    if (!storeContexts.length) {
      throw new Error('No store context found for user');
    }

    return storeContexts[0];
  };


  public updateStoreToken = async (
     storeId: number, newAccessToken: string): Promise<boolean> => {
    try {
      const updatedEntry: UpdateResult = await this.storeRepository.update(
        { id: storeId },
        { access_token: newAccessToken },
      );

      return updatedEntry.affected && updatedEntry.affected > 0;
    } catch (error) {
      this.logger.error(error.message, this.updateStoreToken.name);
      return false;
    }
  };
}
