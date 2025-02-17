import { Body, Controller, forwardRef, Get, HttpCode, HttpStatus, Inject, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';
import { Request, Response} from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AccessTokenGuard, Public } from 'src/auth/guards/access-token.guard';
import { UtilsService } from 'src/utils/utils.service';

@UseGuards(AccessTokenGuard)
@Controller()
export class WebAppController {
  constructor(

    private readonly utilsService: UtilsService,

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
    @Post('login')
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
      res.redirect('/dashboard');

  }
  
    //@UseGuards(AccessTokenGuard)
    @Get('/dashboard')
    @Render('home')
    public async getDashboard(@Req() req: Request, @Res() res)
    {
      console.log(req.headers.authorization)
      console.log(req["user"],req["roles"]);
      const token = this.utilsService.generateToken(req, res)

      return {
        user: {
          name: req["user"].name,

        },
        csrfToken: token,
        appName: 'Shopify App',
        style: '', 
        messages: '',
        isEmbedded: false,
        orders_count: 150,
        orders_revenue: 45678.90,
        customers_count: 1234,
        recentSales: [
          {
            id: 1,
            customer: "John Doe",
            product: "Laptop",
            price: 1299.99,
            status: "Approved"
          },
          {
            id: 2,
            customer: "Jane Smith",
            product: "Smartphone",
            price: 799.50,
            status: "Pending"
          },
          {
            id: 3,
            customer: "Mike Johnson",
            product: "Headphones",
            price: 199.99,
            status: "Rejected"
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
