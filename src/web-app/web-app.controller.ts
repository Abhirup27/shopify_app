import { Body, Controller, forwardRef, Get, HttpCode, HttpStatus, Inject, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';
import { Request, Response} from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AccessTokenGuard, Public } from 'src/auth/guards/access-token.guard';
import { Customer } from 'src/entities/customer.entity';
import { Order } from 'src/entities/order.entity';
import { Store } from 'src/entities/store.entity';
import { JobsService } from 'src/jobs/jobs.service';
import { UtilsService } from 'src/utils/utils.service';
import { UserService } from './user/user.service';
import { User } from 'src/entities/user.entity';

@UseGuards(AccessTokenGuard)
@Controller()
export class WebAppController {
  constructor(

    private readonly utilsService: UtilsService,
    private readonly jobsService: JobsService,
    private readonly userService: UserService,
   
    @Inject(forwardRef(()=> AuthService))
    private readonly authService: AuthService
  )
  {}

    @Public()
    @Get()
    @Render('login')
    public async loginPage(@Req() req: Request, @Res() res : Response)
    {

  
      const token = this.utilsService.generateToken(req, res)
      //console.log(token);
      return {appName: 'Shopify App', style: '',csrfToken: token, messages: ''}
  }
    @Public()
    @Post('/login')
    @HttpCode(HttpStatus.OK)
    public async login(@Body() body, @Req() req: Request, @Res() res : Response)
    {

      console.log(body)
      const response = await this.authService.login({ email: body.email, password: body.password });
      
      console.log("response is", response)
      
      //req.headers.authorization = "Bearer "+response.accessToken; 
      //req.secret = "Bearer " + response; 
      res.cookie('access_token', response.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1 * 60 * 60 * 1000 // 1 hour
      });
      console.log('this')
       res.redirect('/dashboard');

  }

  /**
   * only for testing
   */
  @Public()
  @Get('/getOrders')
  public async syncOrders()
  {
    const { User, UserStore } = await this.userService.findOneByEmail('27abhirup@gmail.com');
    console.log(User)
    const store: Store = await this.userService.findStore(User.user_id);
    await this.jobsService.syncOrders(store);
  }

    //@UseGuards(AccessTokenGuard)
    @Get('/dashboard')
    @Render('home')
    public async getDashboard(@Req() req: Request, @Res() res : Response)
    {
      //console.log(req.headers.authorization)
     // console.log(req["user"],req["roles"]);
      const token = this.utilsService.generateToken(req, res)

      //console.log(req["roles"][0].store_id)
      const recentOrders: Order[] = await this.jobsService.getOrders(req["roles"][0].store_id);
      const customers : Customer[] = await this.jobsService.getCustomers(req["roles"][0].store_id);

      //console.log(recentOrders[0].id)
      let totalRevenue = 0;
      if (recentOrders && recentOrders.length > 0) {
        totalRevenue = recentOrders.reduce((sum, order) => {
          
          const orderPrice = parseFloat(order.total_price as string) || 0;
          return sum + orderPrice;
        }, 0);
      }
     
      return {
        user: {
          name: req["user"].name,

        },
        csrfToken: token,
        appName: 'Shopify App',
        style: '', 
        messages: '',
        isEmbedded: false,
        orders_count: recentOrders.length,
        orders_revenue: totalRevenue,
        customers_count: customers.length,
        recentSales: [
          {
            id: recentOrders[0].id ,
            customer: recentOrders[0].customer["firstName"] + " " + recentOrders[0].customer["lastName"],
            product: recentOrders[0].line_items[0]['name']  + " , " +  recentOrders[0].line_items[1]['name'],
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
            product: recentOrders[3].line_items[0]['name']  + " , " +  recentOrders[3].line_items[1]['name']  + " , " +  recentOrders[3].line_items[2]['name']  + " , " +  recentOrders[3].line_items[3]['name'],
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
        //return according to the role of the user
    }

}
