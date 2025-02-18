import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ORDERS_QUEUE } from "../constants/jobs.constants";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { UtilsService } from "src/utils/utils.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Order } from "src/entities/order.entity";
import { Repository } from "typeorm";
import { AxiosHeaders } from "axios";
import { Store } from "src/entities/store.entity";
import { ShopifyRequestOptions } from "src/types/ShopifyRequestOptions";
import { ShopifyResponse } from "src/types/ShopifyResponse";

interface Money {
  amount: string;
  currencyCode: string;
}

interface MoneySet {
  presentmentMoney: Money;
  shopMoney: Money;
}

interface Image {
  id: string;
  altText?: string;
  url: string;
  width?: number;
}

interface Product {
  id: string;
  productType: string;
  title: string;
  vendor: string;
  updatedAt: string;
  tags: string[];
  publishedAt: string;
  handle: string;
  descriptionHtml: string;
  description: string;
  createdAt: string;
}

interface Variant {
  barcode: string;
  compareAtPrice: string;
  createdAt: string;
  displayName: string;
  id: string;
  image: Image;
  inventoryQuantity: number;
  price: string;
  title: string;
  updatedAt: string;
}

interface TaxLine {
  priceSet: MoneySet;
  rate: number;
  ratePercentage: number;
  title: string;
}

interface Address {
  address1: string;
  address2?: string;
  city: string;
  country: string;
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  zip: string;
}

interface Customer {
  canDelete: boolean;
  createdAt: string;
  displayName: string;
  email: string;
  firstName: string;
  hasTimelineComment: boolean;
  locale: string;
  note?: string;
  updatedAt: string;
  id: string;
  lastName: string;
}

interface TrackingInfo {
  company: string;
  number: string;
  url: string;
}

interface Fulfillment {
  id: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  displayStatus: string;
  estimatedDeliveryAt?: string;
  legacyResourceId: string;
  name: string;
  status: string;
  trackingInfo: TrackingInfo;
}

interface ShippingLine {
  carrierIdentifier: string;
  id: string;
  title: string;
  custom: boolean;
  code: string;
  phone: string;
  originalPriceSet: MoneySet;
  source: string;
  shippingRateHandle: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;
}


@Processor(ORDERS_QUEUE)
export class GetOrdersConsumer extends WorkerHost
{
    private readonly logger = new Logger(GetOrdersConsumer.name);

    constructor
    (
    private readonly configService: ConfigService,
        private readonly utilsService: UtilsService, 
    
        @InjectRepository(Order)
        private readonly ordersRepository: Repository<Order>

    )
    { super(); }

    public process = async (job: Job<Store>): Promise<any> => {
        try {
            const store: Store = job.data;

            const options: ShopifyRequestOptions =
            {
                url: await this.utilsService.getShopifyURLForStore('graphql.json', store),
                headers: this.utilsService.getGraphQLHeadersForStore(store)
            };
            //const headers: AxiosHeaders = this.utilsService.getGraphQLHeadersForStore(store);
            let cursor: string | null = null;
            
            do {
                options.data = this.getQueryObjectForOrders(cursor);
                const response : ShopifyResponse = await this.utilsService.requestToShopify("post", options);

                if (response.statusCode == 200)
                {
                    console.log(response.respBody["data"]);
                }
                console.log(response.respBody);
                cursor = this.getCursorFromResponse(response.respBody['data']['orders']['pageInfo']);

            } while (cursor !== null);

        }
        catch (error)
        {
            console.log("======================= \n","This is running!")
            this.logger.error(error.message);
        }

    }

    public getCursorFromResponse = (pageInfo: PageInfo) : string | null =>
    {
        try {
            return pageInfo.hasNextPage === true ? pageInfo.endCursor : null;
        }
        catch (error)
        {
            this.logger.debug(error.message);
            return null;
        }
    }
    public getQueryObjectForOrders = (cursor: string | null):  { query: string } | null => {
        try {
            const filter = `(first: 5${cursor ? `, after: "${cursor}"` : ''})`;
            
            const query = `{
            orders${filter} {
                edges {
                node {
                    id
                    email
                    name
                    processedAt
                    registeredSourceUrl
                    taxesIncluded
                    legacyResourceId
                    fulfillable
                    customerLocale
                    phone
                    displayFinancialStatus
                    confirmed
                    closed
                    closedAt
                    cancelReason
                    cancelledAt
                    createdAt
                    updatedAt
                    tags
                    lineItems(first: 20) {
                    edges {
                        node {
                        id
                        image {
                            id
                            altText
                            url
                            width
                        }
                        name
                        nonFulfillableQuantity
                        originalTotalSet {
                            presentmentMoney {
                            amount
                            currencyCode
                            }
                            shopMoney {
                            amount
                            currencyCode
                            }
                        }
                        product {
                            id
                            productType
                            title
                            vendor
                            updatedAt
                            tags
                            publishedAt
                            handle
                            descriptionHtml
                            description
                            createdAt
                        }
                        quantity
                        sku
                        taxLines {
                            priceSet {
                            presentmentMoney {
                                amount
                                currencyCode
                            }
                            shopMoney {
                                amount
                                currencyCode
                            }
                            }
                            rate
                            ratePercentage
                            title
                        }
                        taxable
                        title
                        unfulfilledQuantity
                        variantTitle
                        variant {
                            barcode
                            compareAtPrice
                            createdAt
                            displayName
                            id
                            image {
                            id
                            altText
                            url
                            width
                            }
                            inventoryQuantity
                            price
                            title
                            updatedAt
                        }
                        vendor
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                        hasPreviousPage
                        startCursor
                    }
                    }
                    fulfillments {
                    createdAt
                    deliveredAt
                    displayStatus
                    estimatedDeliveryAt
                    id
                    inTransitAt
                    legacyResourceId
                    location {
                        id
                        name
                    }
                    name
                    status
                    totalQuantity
                    trackingInfo {
                        company
                        number
                        url
                    }
                    }
                    totalPriceSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                    shopMoney {
                        amount
                        currencyCode
                    }
                    }
                    shippingLine {
                    carrierIdentifier
                    id
                    title
                    custom
                    code
                    phone
                    originalPriceSet {
                        presentmentMoney {
                        amount
                        currencyCode
                        }
                        shopMoney {
                        amount
                        currencyCode
                        }
                    }
                    source
                    shippingRateHandle
                    }
                    shippingAddress {
                    address1
                    address2
                    city
                    country
                    firstName
                    lastName
                    phone
                    province
                    zip
                    }
                    billingAddress {
                    address1
                    address2
                    city
                    country
                    firstName
                    lastName
                    phone
                    province
                    zip
                    }
                    customer {
                    canDelete
                    createdAt
                    displayName
                    email
                    firstName
                    hasTimelineComment
                    locale
                    note
                    updatedAt
                    id
                    lastName
                    }
                    currentSubtotalPriceSet {
                    presentmentMoney {
                        amount
                        currencyCode
                    }
                    shopMoney {
                        amount
                        currencyCode
                    }
                    }
                    currentTaxLines {
                    channelLiable
                    priceSet {
                        presentmentMoney {
                        amount
                        currencyCode
                        }
                        shopMoney {
                        amount
                        currencyCode
                        }
                    }
                    rate
                    ratePercentage
                    title
                    }
                }
                }
                pageInfo {
                hasNextPage
                endCursor
                hasPreviousPage
                startCursor
                }
            }
            }`;

            return  {query} ;
        } catch (error) {
            return null;
        }
    }

}