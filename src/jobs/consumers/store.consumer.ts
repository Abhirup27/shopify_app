import { Processor, WorkerHost } from "@nestjs/bullmq";
import { GET_STORE, STORES_QUEUE, SYNC_STORE } from "../constants/jobs.constants";
import { Store } from "src/entities/store.entity";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "bullmq";



@Processor(STORES_QUEUE)
export class StoresConsumer extends WorkerHost {
    private readonly logger = new Logger(StoresConsumer.name);

    constructor
        (
            @InjectRepository(Store)
            private readonly storesRepository: Repository<Store>
        ) { super() }

    public process = async (job: Job<number>): Promise<Store | boolean> => {
        try {
            switch (job.name) {
                case GET_STORE:

                    return await this.retrieveStore(job);
                case SYNC_STORE:
                    return await this.syncStore(job);
                default:
                    throw Error("Invalid job");

            }

        }
        catch (error) {
            this.logger.error(error.message);
            return null;
        }

    }

    private retrieveStore = async (job: Job): Promise<Store | null> => {

        let storeId;

        try {
            typeof job.data === 'number' ? storeId = job.data : null;

            const store: Store = await this.storesRepository.findOneBy({
                table_id: storeId
            })
            if (store !== undefined) {
                return store
            }

        } catch (error) {
            this.logger.error(error.message, this.retrieveStore.name);
        }

        return null;
    }

    private syncStore = async (job: Job): Promise<Store | null> => {
        try {


        } catch (error) {
            this.logger.error(error.message, this.syncStore.name);
            return null;
        }
    }
}
