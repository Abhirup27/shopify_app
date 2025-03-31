import { Processor, WorkerHost } from "@nestjs/bullmq";
import { CREATE_USER, GET_USERS, USERS_QUEUE } from "../constants/jobs.constants";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/database/entities/user.entity";
import { Repository } from "typeorm";
import { UserStore } from "src/database/entities/userstore.entity";
import { Job } from "bullmq";
import { RegisterUserDto } from "src/web-app/dtos/register-member.dto";
import { HashingProvider } from "src/auth/providers/hashing.provider";
import { ADMIN, ADMIN_PERMS, ALL_PERMS, SUB_USER } from "src/database/entities/constants/user-roles.constants";




@Processor(USERS_QUEUE)
export class UsersConsumer extends WorkerHost {

  private readonly logger = new Logger(UsersConsumer.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(UserStore) private readonly userStoresRepository: Repository<UserStore>,

    private readonly hashingProvider: HashingProvider
  ) { super() };


  public process = async (job: Job<number | { newMember: RegisterUserDto, storeId: number }, UserStore | UserStore[]>): Promise<UserStore[] | UserStore> => {

    try {
      switch (job.name) {
        case GET_USERS:
          if (typeof job.data != 'number') {
            throw new Error('Invalid data provided, expected a number');
          }
          return await this.retrieveUsersForStore(job.data);
        case CREATE_USER:
          if (typeof job.data == 'number') {
            throw new Error('Invalid data provided, expected an Object with RegisterUserDto and a number');
          }
          return await this.createUser({ user: job.data.newMember, storeId: job.data.storeId });
        default:
          throw Error("Invalid job");

      }
    } catch (error) {
      this.logger.error(error.message);
    }

  }

  private retrieveUsersForStore = async (storeId: number): Promise<UserStore[]> => {

    try {

      return await this.userStoresRepository.find({ where: { store_id: storeId }, relations: ['user'] });



    } catch (error) {

      this.logger.error(error.message, this.retrieveUsersForStore.name);
    }
  }

  private createUser = async (data: { user: RegisterUserDto, storeId: number }): Promise<UserStore> => {
    let createdUserStore: UserStore;
    try {
      let user: User;
      if (!await this.usersRepository.existsBy({ email: data.user.email })) {
        const user_payload = {
          email: data.user.email,
          name: data.user.name,
          password: await this.hashingProvider.hashPassword((data.user.password)),
          email_verified_at: new Date(),
        }


        user = this.usersRepository.create(user_payload);
        user = await this.usersRepository.save(user);
      } else {
        user = await this.usersRepository.findOneBy({ email: data.user.email });
      }
      const userStorePayload = {
        user_id: user.user_id,
        store_id: data.storeId,
        role: data.user.isAdmin == 'true' ? ADMIN : SUB_USER,
        permissions: (data.user.isAdmin == 'true') ? ADMIN_PERMS : data.user.permissions

      }
      createdUserStore = this.userStoresRepository.create(userStorePayload);
      createdUserStore = await this.userStoresRepository.save(createdUserStore);

    } catch (error) {
      this.logger.error(error.message, this.createUser.name);
    }
    return createdUserStore;
  }
}


