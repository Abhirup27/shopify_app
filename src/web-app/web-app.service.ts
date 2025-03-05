import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { UserDto } from './dtos/user.dto';
import { Order } from 'src/entities/order.entity';
import { Customer } from 'src/entities/customer.entity';
import { JobsService } from 'src/jobs/jobs.service';

@Injectable()
export class WebAppService {

    private readonly logger = new Logger(WebAppService.name);
    constructor(
        private readonly utilsService: UtilsService,
        private readonly configService: ConfigService,
        private readonly jobsService: JobsService,
    ) { }


    public getSuperDashboardPayload = async (user: UserDto): Promise<Object> => {
        let dashboard: Object = {};

        try {
            const recentOrders: Order[] = await this.jobsService.getOrders(user.store_id);
            const customers: Customer[] = await this.jobsService.getCustomers(user.store_id);

            let totalRevenue = 0;
            if (recentOrders && recentOrders.length > 0) {
                totalRevenue = recentOrders.reduce((sum, order) => {

                    const orderPrice = parseFloat(order.total_price as string) || 0;
                    return sum + orderPrice;
                }, 0);
            }

            dashboard = {
                user: {
                    name: user.name,

                },
                csrfToken: null,
                appName: 'Shopify App',
                style: '',
                messages: '',
                isEmbedded: false,
                orders_count: recentOrders.length,
                orders_revenue: totalRevenue,
                customers_count: customers.length,
                recentSales: [
                    {
                        id: recentOrders[0].id,
                        customer: recentOrders[0].customer["firstName"] + " " + recentOrders[0].customer["lastName"],
                        product: recentOrders[0].line_items[0]['name'] + " , " + recentOrders[0].line_items[1]['name'],
                        price: recentOrders[0].total_price,
                        status: recentOrders[0].financial_status
                    },
                    {
                        id: recentOrders[1].id,
                        customer: recentOrders[1].customer["firstName"] + " " + recentOrders[1].customer["lastName"],
                        product: recentOrders[1].line_items[0]['name'],
                        price: recentOrders[1].total_price,
                        status: "Pending"
                    },
                    {
                        id: recentOrders[2].id,
                        customer: recentOrders[1].customer["firstName"] + " " + recentOrders[1].customer["lastName"],
                        product: "Headphones",
                        price: recentOrders[2].total_price,
                        status: "Rejected"
                    },
                    {
                        id: recentOrders[3].id,
                        customer: recentOrders[3].customer["firstName"] + " " + recentOrders[3].customer["lastName"],
                        product: recentOrders[3].line_items[0]['name'] + " , " + recentOrders[3].line_items[1]['name'] + " , " + recentOrders[3].line_items[2]['name'] + " , " + recentOrders[3].line_items[3]['name'],
                        price: recentOrders[3].total_price,
                        status: "Approved"
                    }
                ],
                topSelling: [
                    {
                        image: "/path/to/laptop-image.jpg",
                        name: "Gaming Laptop",
                        price: 1499.99,
                        sold: 45,
                        revenue: 67499.55
                    },
                    {
                        image: "/path/to/smartphone-image.jpg",
                        name: "Premium Smartphone",
                        price: 999.99,
                        sold: 30,
                        revenue: 29999.70
                    }
                ],
                activities: [
                    {
                        time: "1 hour ago",
                        status: "primary",
                        content: "New order received"
                    },
                    {
                        time: "2 hours ago",
                        status: "success",
                        content: "Product shipped"
                    }
                ],
                news: [
                    {
                        image: "/path/to/news-image-1.jpg",
                        title: "Company Milestone Reached",
                        excerpt: "We've hit our quarterly sales target early this year!"
                    },
                    {
                        image: "/path/to/news-image-2.jpg",
                        title: "New Product Launch",
                        excerpt: "Introducing our latest innovation next month"
                    }
                ]
            }
        } catch (error) {
            this.logger.error(error.message, this.getSuperDashboardPayload.name);
        }


        return dashboard;
    }

    public getDashboardPayload = async (user: UserDto): Promise<Object> => {
        let dashboard: Object = {};


        return dashboard;
    }
}
