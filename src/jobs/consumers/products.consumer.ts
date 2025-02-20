import { Processor, WorkerHost } from "@nestjs/bullmq";
import { GET_PRODUCTS, PRODUCTS_QUEUE, SYNC_PRODUCTS } from "../constants/jobs.constants";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { UtilsService } from "src/utils/utils.service";
import { Store } from "src/entities/store.entity";
import { Repository } from "typeorm";
import { Job } from "bullmq";
import { ShopifyRequestOptions } from "src/types/ShopifyRequestOptions";
import { AxiosHeaders } from "axios";
import { Product } from "src/entities/product.entities";
import { ShopifyResponse } from "src/types/ShopifyResponse";
import { Logger } from "@nestjs/common";



@Processor(PRODUCTS_QUEUE)
export class ProductsConsumer extends WorkerHost
{
    private readonly logger = new Logger(ProductsConsumer.name)

    constructor(
        private readonly configService: ConfigService,
        private readonly utilsService: UtilsService,

        @InjectRepository(Product)
        private readonly productsRepository: Repository<Product>
    )
    { super() }

    public process = async (job: Job<Store>): Promise<any> => {
        try
        {        
            switch (job.name)
            {
                case SYNC_PRODUCTS:
                    return await this.syncProducts(job);
                case GET_PRODUCTS:
                    return await this.retrieveProducts(job);
                default:
                    throw new Error('Invalid job name');
                    break;
            }
            
        }
        catch (error)
        {
            this.logger.error(error.message);
        }
    }

    private syncProducts =  async (job: Job<Store>): Promise<void> => {
        try {
             const store = job.data ?? null;
            
            let since_id: number = 0;
            let products = new Array();
            const requestOptions: ShopifyRequestOptions = { url: null, headers: null };
            requestOptions.headers = new AxiosHeaders().set('Content-Type', 'application/json').set('X-Shopify-Access-Token', store["access_token"]);
            
                requestOptions.url = await this.utilsService.getShopifyURLForStore(`products.json?since_id=${since_id}`, store);
                const response: ShopifyResponse = await this.utilsService.requestToShopify("get", requestOptions);
                //console.log(response.respBody["products"]);
                response.statusCode == 200 ? products.push(...response.respBody["products"]) : null;
                products.forEach(async (product) => {
                    product.store_id = store["table_id"];
                    //console.log(store);
                    await this.storeProductDB(product);
                    since_id = product.id;
                });
            
        } catch (error) {
            this.logger.error(error.message);
        }
    }

    public storeProductDB = async (product: Product): Promise<Product | null> => 
    {
        let productCreated: Product = undefined;
        try
        {
            const payload =
            {
                store_id: product.store_id,
                id: product.id,
                title: product.title,
                vendor: product.vendor,
                body_html: product.body_html,
                handle: product.handle,
                created_at: product.created_at,
                updated_at: product.updated_at,
                product_type: product.product_type,
                admin_graphql_api_id: product.admin_graphql_api_id,
                variants: product.variants,
                options: product.options,
                images: product.images,
                tags: product.tags
            }
            productCreated = this.productsRepository.create(payload);
            productCreated = await this.productsRepository.save(payload);
        }
        catch (error)
        {
            console.log("This ran")
            this.logger.error(error);
            return null;
        }

        return productCreated;
    }

    private retrieveProducts = async (job: Job<Store>): Promise<Product[] | Product | null> => {
        let products: Product[] | Product;
        try {
            const store = job.data;
            products = await this.productsRepository.findBy({
                store_id: store.table_id
            })
        } catch (error) {
            this.logger.error(error.message);
        }


        return null;
    }
}