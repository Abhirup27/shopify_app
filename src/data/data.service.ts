
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
import Redlock, {  Lock } from 'redlock';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);
  private readonly NONCE_PREFIX = 'shopify:nonce:';
  private readonly NONCE_EXPIRY = '120s';

  constructor(
    //@Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly cacheService: CacheService,
    @Inject('CACHE_LOCK') private readonly redLock: Redlock,
    //private readonly redLock: RedlockService,
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
    try {
      const cacheCredits = await this.cacheService.get<number>(`${storeId}-credits`);
      console.log(cacheCredits);
      const dbResult = await this.storePlanRepository.findOne({ where: { store_id: storeId } });
      console.log(dbResult.credits);
      if (cacheCredits != undefined || !isNaN(cacheCredits)) {
        dbResult.credits = cacheCredits;
      }
      return dbResult;
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
    return new StorePlan();
  };

  public updatePlan = async (storePlan: StorePlan) => {
    //await this.storePlanRepository.upsert(storePlan, ['id']);
    //await this.storePlanRepository.update({last_charge_id: storePlan.last_charge_id}, storePlan);
    await this.storePlanRepository.save(storePlan);
  };
  // need to use locks
  public setPlanState = async (chargeObj: Record<any, any>) => {
    try {
      let lock: Lock;
      let commitedCredits: number;
      const storePlan = await this.storePlanRepository.findOneBy({
        store_id: chargeObj.admin_graphql_api_shop_id.split('/').pop(),
      });

      //if executed before the billing function and the func which sets the new pending plan with id
      if (storePlan.last_charge_id != chargeObj.admin_graphql_api_id) {
        if (new Date(chargeObj.updated_at).getTime() > storePlan.updatedAt.getTime()) {

          storePlan.last_charge_id = chargeObj.admin_graphql_api_id.split('/').pop();
          //storePlan.charge_history
          storePlan.status = chargeObj.status;

          if (chargeObj.status == 'ACTIVE') {
            console.log('these ran');
            const plans: Plan[] = await this.getPlans();
            const plan = plans.find(plan => plan.name === chargeObj.name);
            console.log('plan retrieved ', plan);
            storePlan.plan_id = plan.id;
            storePlan.price = plan.price;

            lock = await this.getStoreCreditsLock(storePlan.store_id);
            if (lock != null || lock != undefined) {
              const credits = await this.getStoreCredits(storePlan.store_id);
              storePlan.credits = plan.credits + credits;
              commitedCredits= storePlan.credits;
            }
            // storePlan.credits += plan.credits;
            storePlan.status = 'ACTIVE';

            // also set the charge history
          }
        }
      } //pending plan was set from the billing function, set the plan active, store charge history, add credits
      else {
        if (chargeObj.status == 'ACTIVE') {
          // I could fetch the plan relation within the findOne function
          const plan: Plan = await this.getPlans()[storePlan.plan_id - 1];
          const lock: Lock = await this.getStoreCreditsLock(storePlan.store_id);

          if (lock != null || lock != undefined) {
            const credits = await this.getStoreCredits(storePlan.store_id);
            storePlan.credits = plan.credits + credits;
            commitedCredits= storePlan.credits;
          }
          storePlan.status = 'ACTIVE';
          //const chargeHistory= storePlan.charge_history;
        }
      }
      console.log(JSON.stringify(storePlan));
      await this.storePlanRepository.update({ id: storePlan.id }, storePlan);
      await this.cacheService.set(
        `${ chargeObj.admin_graphql_api_shop_id.split('/').pop()}-credits`,
        commitedCredits,
        '5m',
      );
      if(chargeObj.status != 'CANCELLED') {
        await lock.release();
      }

    } catch(error) {
      this.logger.error(error.message, error.stack);
      throw error;
    }
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
        if (chargeId != undefined && existingPlan.last_charge_id != chargeId) {
          //console.log('execute')
          existingPlan.plan_id = planId;
          existingPlan.price = selectedPlan.price;
          existingPlan.user_id = userId;
          existingPlan.last_charge_id = chargeId;
          existingPlan.status = 'PENDING';

          const updatedPlan = await queryRunner.manager.save(existingPlan);
          await queryRunner.commitTransaction();
          //console.log(JSON.stringify(existingPlan))
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
          status: 'ACTIVE',
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
    //if (chargeIds.length === 0) return [];
    return await this.storePlanRepository
      .createQueryBuilder('store_plan')
      .leftJoinAndSelect('store_plan.store', 'store') // Load store relation
      .where("store_plan.status = 'PENDING'")
      .andWhere('store_plan.last_charge_id IN (:...chargeIds)', { chargeIds })
      .getMany();
  };

  public getPendingSubs = async () => {
    const pending = await this.cacheService.get<Record<string, string>>('PENDING-SUBSCRIPTIONS');
    if (pending == null || pending == undefined) {
      return null;
    }
    if (Object.keys(pending).length > 0) {
      return pending;
    }
    return null;
  };
  public setPendingSubs = async (chargeId: string, attempts: string): Promise<boolean> => {
    const existing = await this.getPendingSubs();
    if (existing != null) {
      existing[chargeId] = attempts;
      return this.cacheService.set('PENDING-SUBSCRIPTIONS', existing, 0);
    }
    const newRecord: Record<string, string> = {};
    newRecord[chargeId] = attempts;
    return this.cacheService.set('PENDING-SUBSCRIPTIONS', newRecord, 0);
  };
  public deletePendingSub = async (chargeId: string): Promise<boolean> => {
    const existing = await this.getPendingSubs();
    if (existing != null) {
      delete existing[chargeId];

      await this.cacheService.delete('PENDING-SUBSCRIPTIONS');
      return await this.cacheService.set('PENDING-SUBSCRIPTIONS', existing, 0);
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
  public getProductTypes = async ( key?:string ): Promise<Record<string, string>> => {
    let result: Record<string, string> = {};
    if (key != null) {
      result = await this.cacheService.get<Record<string, string>>(key);
      if (result == undefined ||
        result == null) {
        this.cacheProductTypes(key, key);
        const db = await this.productTypeRepository.findBy({ parentId: key });
        const record: Record<string, string> = Object.fromEntries(
          db.map(item => [item.id, item.name])
        );
        return record;

      }
    }
      result = await this.cacheService.get<Record<string, string>>('product-types');

      if (result == undefined || result == null) {
          this.cacheProductTypes();
          const db = await this.productTypeRepository.findBy({ parentId: key });
          const record: Record<string, string> = Object.fromEntries(
            db.map(item => [item.id, item.name])
          );

          return record;
      }
      return result;


  };
  //this function is also in products.consumer.ts, need to delete that.
  private async cacheProductTypes(parentId: string | null = '', cacheKey: string = 'product-types'): Promise<void> {
    try {
      // Stack to store work items: [parentId, cacheKey]
      console.log(cacheKey)
      const stack: Array<{
        parentId: string | null;
        cacheKey: string;
      }> = [];

      // Initialize stack with the starting parameters
      stack.push({ parentId, cacheKey });

      while (stack.length > 0) {
        const { parentId: currentParentId, cacheKey: currentCacheKey } = stack.pop();

        let children: ProductType[] = [];

        if ((currentParentId == '' || currentParentId == null) && currentCacheKey == 'product-types') {
          children = await this.productTypeRepository.findBy({ isRoot: true });

          //if there are no root types, that means it has not been synced from shopify to DB ever, so abort
          if(children.length == 0) {
            return;
          }
        } else {
          children = await this.productTypeRepository.findBy({ parentId: currentParentId });
        }
        if (!children.length) continue;

        const currentLevelMap: Record<string, string> = {};

        for (const product of children) {
          currentLevelMap[product.id] = product.name;
          // If this node has children (not a leaf), add it to the stack for processing
          if (product.isLeaf === false) {
            stack.push({
              parentId: product.id,
              cacheKey: product.id,
            });
          }
        }

        // Cache the map for the current level
        // await this.cacheService.storeMap(currentCacheKey, currentLevelMap);
        //await this.dataService.setProductCategoryMap(currentCacheKey, currentLevelMap);
        await this.cacheService.set(currentCacheKey, currentLevelMap, 0);
        //await this.setProductCategorySyncStatus(true);
      }
    } catch (error) {
      this.logger.error(
        `Error syncing product level with parent ID ${parentId}: ${error}`,
        this.cacheProductTypes.name,
      );
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


  public createNonce = async (shopDomain: string): Promise<string> => {
    const nonce = randomBytes(16).toString('hex');

    await this.cacheService.set(`${this.NONCE_PREFIX}${nonce}`, shopDomain, this.NONCE_EXPIRY);
    return nonce;
  };

  public storeNonce = async (nonce: string, shopDomain: string): Promise<void> => {
    await this.cacheService.set(`${this.NONCE_PREFIX}${nonce}`, shopDomain, this.NONCE_EXPIRY);
  };
  public validateAndRemoveNonce = async (nonce: string, shopDomain: string): Promise<boolean> => {
    const key = `${this.NONCE_PREFIX}${nonce}`;
    const storedShopDomain = await this.cacheService.get<string>(key);

    if (storedShopDomain === shopDomain) {
      await this.cacheService.
      delete(key);
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

  public updateStoreToken = async (storeId: number, newAccessToken: string): Promise<boolean> => {
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
  public getStoreToken = async(storeId: number): Promise<number> => {
    const credits = await this.cacheService.get<number>(`${storeId}-credits`);
    if(isNaN(credits)){
      const storePlan = await this.storePlanRepository.findOneBy({store_id: storeId});
      return storePlan.credits;
    }
    return credits;
  };
  public getStoreCredits = async (storeId: number): Promise<number> => {
    const credits =  await this.cacheService.get<number>(`${storeId}-credits`);
    if(isNaN(credits)){
      const creditsDB = await this.storePlanRepository.findOneBy({store_id: storeId});
      console.log('in db', creditsDB.credits);
      this.cacheService.set(`${storeId}-credits`, creditsDB.credits, '5m');
      let keys = new Set(await this.cacheService.get<Array<string>>('credits-keys'));
      if (keys != undefined || keys != null) {
        keys.add(storeId.toString());
       // keys.push(storeId.toString());
      } else {
        keys = new Set<string>();
        keys.add(storeId.toString());
      //  keys.push(storeId.toString());
      }
      await this.cacheService.set('credits-keys', [...keys]);
      console.log('done');
      return creditsDB.credits;
    }
    return credits;
  };
  public setStoreCredits = async(storeId: number, credits: number): Promise<boolean> => {
    const result= await this.cacheService.set(`${storeId}-credits`, credits, '5m');
    let keys = new Set( await this.cacheService.get<Array<string>>('credits-keys'));
    if (keys != undefined || keys != null) {
      keys.add(storeId.toString());
    } else {
      keys = new Set<string>();
      keys.add(storeId.toString());
    }
    await this.cacheService.set('credits-keys', [...keys]);
    return result;
  }
  // @Redlock<DataService["readStoreCredits"]>(
  //   (target: DataService, storeId: number): any=> {`${storeId}-credits`},
  // })
  public readStoreCredits = async (storeId: number): Promise<number> => {
    try{
      const value = await this.redLock.using([`locks:${storeId}-credits`], 2000, async signal => {
        const creditsCache = await this.cacheService.get<number>(`${storeId}-credits`);
        if (signal.aborted) {
          throw signal.error;
        }
        console.log('in cache', creditsCache);
        if (isNaN(creditsCache)) {
          const creditsDB = await this.storePlanRepository.findOneBy({store_id: storeId});
          console.log('in db', creditsDB.credits);
          this.cacheService.set(`${storeId}-credits`, creditsDB.credits, '5m');
          let keys = new Set(await this.cacheService.get<Set<string>>('credits-keys'));
          if (keys != undefined || keys != null) {
            keys.add(storeId.toString());
          } else {
            keys = new Set<string>();
            keys.add(storeId.toString());
          }
          await this.cacheService.set('credits-keys', [...keys]);

          console.log('done');
          return creditsDB.credits;
        } else {
          return creditsCache;
        }
      });

      return value;
    }catch(error){
      this.logger.error(error, error.stack);
    }
    //const lock2 = await this.redLock.using(`${storeId}-credits`, duration )
  };

  public writeStoreCredits = async (storeId: string, value: number): Promise<boolean> => {
    const result = await this.redLock.using([`locks:${storeId}-credits`], 2000, async signal => {
      return await this.cacheService.set<number>(`${storeId}-credits`, value, '5m');
    });

    return result;

  };

  public getStoreCreditsLock = async (storeId: number, retry: number = 3): Promise<Lock> => {
    try {
      const result = await this.redLock.acquire([`locks:${storeId}-credits`], 4000, { retryCount: retry });
      return result;
    } catch(error){
        this.logger.error(error, error.stack);
        throw error;
      }
    };
}
