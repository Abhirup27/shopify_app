import { Body, Controller, forwardRef, Get, HttpCode, HttpStatus, Inject, Logger, Post, Query, Render, Req, Res, UseGuards } from '@nestjs/common';
import { query, Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AccessTokenGuard, Public } from 'src/auth/guards/access-token.guard';
import { Store } from 'src/entities/store.entity';
import { UtilsService } from 'src/utils/utils.service';
import { UserService } from './user/user.service';
import { StoreContextGuard } from './store-context.guard';
import { WebAppService } from './web-app.service';
import { CurrentUser } from './decorators/user.decorator';
import { UserDto } from './dtos/user.dto';
import { SUPER_ADMIN } from 'src/entities/constants/user-roles.constants';

@UseGuards(AccessTokenGuard, StoreContextGuard)
@Controller()
export class WebAppController {

  private readonly logger = new Logger(WebAppController.name);
  constructor(

    private readonly webAppService: WebAppService,
    private readonly utilsService: UtilsService,

    private readonly userService: UserService,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) { }

  @Public()
  @Get()
  @Render('login')
  public async loginPage(@Req() req: Request, @Res() res: Response) {


    const token = this.utilsService.generateToken(req, res)
    //console.log(token);
    return { appName: 'Shopify App', style: '', csrfToken: token, messages: '' }
  }
  @Public()
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  public async login(@Body() body, @Req() req: Request, @Res() res: Response) {

    const response = await this.authService.login({ email: body.email, password: body.password });

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
  public async getDashboard(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response) {
    // console.log(req["user"],req["roles"]);

    //console.log(req['userStore'].hasRole('Super Admin'))
    //console.log(req["roles"][0].store_id)
    // const recentOrders: Order[] = await this.jobsService.getOrders(user.store_id);
    // const customers: Customer[] = await this.jobsService.getCustomers(user.store_id);
    //console.log("by using the dto,", user.hasRole('Super Admin'));

    const token = this.utilsService.generateToken(req, res)

    if (user.hasRole(SUPER_ADMIN)) {
      const payload = await this.webAppService.getSuperDashboardPayload(user);
      payload['csrfToken'] = token;

      res.render('superadmin/home', payload);

    }
    else {
      const payload = await this.webAppService.getDashboardPayload(user);
      payload['csrfToken'] = token;

      res.render('home', payload);
    }
    //console.log(recentOrders[0].id)

  }


  @Get('/orders')
  public async getOrders(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {
    let payload: Object = {};
    const token = this.utilsService.generateToken(req, res)
    try {
      payload = await this.webAppService.getOrders(user);
      payload['csrfToken'] = token;
    } catch (error) {
      this.logger.error(error.message);
    }

    res.render('orders/index', payload);

  }

  @Get('/products')
  public async getProducts(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {


  }

  @Get('/syncOrders')
  public async syncOrders(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {

    if (user.hasRole(SUPER_ADMIN) || user.can(['write_orders'])) {
      await this.webAppService.syncOrders(user.store_id);
    }

    res.redirect(`/orders?storeId=${user.store_id}`);
  }
}
