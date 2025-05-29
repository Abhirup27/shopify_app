import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { Repository } from 'typeorm';
import { UserStore } from 'src/database/entities/userstore.entity';
import { Job } from 'bullmq';
import { HashingProvider } from 'src/auth/providers/hashing.provider';
import { ADMIN, ADMIN_PERMS, SUB_USER } from 'src/database/entities/constants/user-roles.constants';

type UserJobNames = typeof JOB_TYPES.GET_USERS | typeof JOB_TYPES.CREATE_USER | typeof JOB_TYPES.GET_STORES_FOR_USER;

type UserQueueJobs = {
  [K in UserJobNames]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[UserJobNames];

@Processor(QUEUES.USERS, { concurrency: 10 })
export class UsersConsumer extends WorkerHost {
  private readonly logger = new Logger(UsersConsumer.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(UserStore) private readonly userStoresRepository: Repository<UserStore>,

    private readonly hashingProvider: HashingProvider,
  ) {
    super();
  }

  public process = async (job: UserQueueJobs): Promise<JobRegistry[UserJobNames]['result']> => {
    try {
      switch (job.name) {
        case JOB_TYPES.GET_USERS:
          //      if (typeof job.data != 'number') {
          //      throw new Error('Invalid data provided, expected a number');
          //   }
          return await this.retrieveUsersForStore(job.data);
        case JOB_TYPES.CREATE_USER:
          // if (typeof job.data == 'number') {
          //  throw new Error('Invalid data provided, expected an Object with RegisterUserDto and a number');
          // }
          return await this.createUser({ user: job.data.user, storeId: job.data.storeId });

        case JOB_TYPES.GET_STORES_FOR_USER:
          return await this.retrieveAllStoresForUser(job.data);

        default:
          throw Error('Invalid job');
      }
    } catch (error) {
      this.logger.error(error.message, error.stack, this.process.name);
    }
  };

  private retrieveAllStoresForUser = async (
    data: JobRegistry[typeof JOB_TYPES.GET_STORES_FOR_USER]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_STORES_FOR_USER]['result']> => {
    const stores: UserStore[] = await this.userStoresRepository.find({
      where: { user_id: data.userId },
      relations: ['store'],
    });
    console.log(stores[0].store.IsPrivate());
    return stores;
  };

  private retrieveUsersForStore = async (
    data: JobRegistry[typeof JOB_TYPES.GET_USERS]['data'],
  ): Promise<UserStore[]> => {
    try {
      return await this.userStoresRepository.find({ where: { store_id: data.storeId }, relations: ['user'] });
    } catch (error) {
      this.logger.error(error.message, this.retrieveUsersForStore.name);
    }
  };

  private createUser = async (
    data: JobRegistry[typeof JOB_TYPES.CREATE_USER]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.CREATE_USER]['result']> => {
    let createdUserStore: UserStore;
    try {
      let user: User;
      if (!(await this.usersRepository.existsBy({ email: data.user.email }))) {
        const user_payload = {
          email: data.user.email,
          name: data.user.name,
          password: await this.hashingProvider.hashPassword(data.user.password),
          email_verified_at: new Date(),
        };

        user = this.usersRepository.create(user_payload);
        user = await this.usersRepository.save(user);
      } else {
        user = await this.usersRepository.findOneBy({ email: data.user.email });
      }
      const userStorePayload = {
        user_id: user.user_id,
        store_id: data.storeId,
        role: data.user.isAdmin == 'true' ? ADMIN : SUB_USER,
        permissions: data.user.isAdmin == 'true' ? ADMIN_PERMS : data.user.permissions,
      };
      createdUserStore = this.userStoresRepository.create(userStorePayload);
      createdUserStore = await this.userStoresRepository.save(createdUserStore);
    } catch (error) {
      this.logger.error(error.message, this.createUser.name);
    }
    return createdUserStore;
  };
}
