import { UserStore } from "src/database/entities/userstore.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Injectable, Logger } from "@nestjs/common";
import { ROLE_PERMISSIONS, SUPER_ADMIN } from "src/database/entities/constants/user-roles.constants";

@Injectable()
export class CreateSuperAdmin {
    private readonly logger = new Logger(CreateSuperAdmin.name);

    constructor
        (
            @InjectRepository(UserStore)
            private userStore: Repository<UserStore>
        ) { }

    public create = async (userId: number, storeId: number): Promise<UserStore | null> => {
        let newAdmin: UserStore = undefined;

        try {
            if (userId > 0 && storeId > 0) {
                const payload =
                {
                    user_id: userId,
                    store_id: storeId,
                    role: SUPER_ADMIN,
                    permissions: ROLE_PERMISSIONS.SUPER_ADMIN
                };

                newAdmin = this.userStore.create(payload);
                newAdmin = await this.userStore.save(payload);
            }
            else {
                throw new Error('Store Id and User Id must be greater than 0');
            }
        }
        catch (error) {
            this.logger.error(error.message);
            return null;
        }

        return newAdmin;
    }
}