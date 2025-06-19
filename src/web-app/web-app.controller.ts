import {
  Body,
  Controller,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  Render,
  Req,
  Res,
  UnauthorizedException, UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AccessTokenGuard, Public } from 'src/auth/guards/access-token.guard';
import { UtilsService } from 'src/utils/utils.service';
import { StoreContextGuard } from './guards/store-context.guard';
import { WebAppService } from './web-app.service';
import { CurrentUser } from './decorators/user.decorator';
import { UserDto } from './dtos/user.dto';
import { ADMIN, SUPER_ADMIN } from 'src/database/entities/constants/user-roles.constants';
import { RegisterUserDto } from './dtos/register-member.dto';
import { newProductDto } from './dtos/new-product.dto';
import { unwatchFile } from 'fs';
import { CsrfExceptionFilter } from '../filters/csrf.exception.filter';
import { RateLimitingGuard } from './guards/rate-limiting.guard';


/**
 *
 * */
@UseFilters(CsrfExceptionFilter)
@UseGuards(RateLimitingGuard, AccessTokenGuard, StoreContextGuard)
@Controller()
export class WebAppController {
  private readonly logger = new Logger(WebAppController.name);
  constructor(
    private readonly webAppService: WebAppService,
    private readonly utilsService: UtilsService,


    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Get()
  @Render('login')
  public async loginPage(@Req() req: Request, @Res() res: Response) {

   // const token: string = this.utilsService.generateToken(req, res);
   // console.log(token);
    return {
      appName: 'Shopify App',
      style: '',
      csrfToken: '',
      messages: '',
    };
  }
  @Public()
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  public async login(@Body() body, @Req() req: Request, @Res() res: Response) {
    const accessToken: string = await this.authService.login({
      email: body.email,
      password: body.password,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // access_token cookie will be sent to other redirected websites
      maxAge: 1 * 60 * 60 * 1000, // 1 hour
    });

    res.redirect('/dashboard');
  }

  //@UseGuards(AccessTokenGuard)
  @Get('/dashboard')
  public async getDashboard(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response) {

    const token = this.utilsService.generateToken(req, res);
    //const token = req['generateCsrfToken'](req, res);
    if (user.hasRole(SUPER_ADMIN)) {
      const payload = await this.webAppService.getSuperDashboardPayload(user);
      payload['csrfToken'] = token;

      res.render('superadmin/home', payload);
    } else {
      const payload = await this.webAppService.getDashboardPayload(user);

      payload['csrfToken'] = token;
      res.render('home', payload);
    }
    //console.log(recentOrders[0].id)
  }

  /**
   * Only for the super admin
   * */

  @Get('/stores')
  public async getStores(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response) {
    try {
      let payload;
      //if the logged in user is a super admin in any one stores
      for (const userStore of req['roles']) {
        if (userStore.role == 'SUPER_ADMIN') {
          payload = await this.webAppService.getStoresPayload(user);
          payload['csrfToken'] = this.utilsService.generateToken(req, res);
          res.render('superadmin/stores/index', payload);
          return;
        }
      }
      res.status(401).send('the user is not a super admin.');
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  }

  @Get('/orders')
  public async getOrders(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {
    let payload: object = {};
    const token = this.utilsService.generateToken(req, res);
    try {
      payload = await this.webAppService.getOrders(user);
      payload['csrfToken'] = token;
    } catch (error) {
      this.logger.error(error.message);
    }

    res.render('orders/index', payload);
  }

  @Get('/order')
  public async getOrderDetails(
    @CurrentUser() user: UserDto,
    @Req() req: Request,
    @Res() res: Response,
    @Query() query,
  ) {
    try {
      let payload: object = {};
      const orderId: number = query.order_id;
      if (orderId == undefined) {
        throw new Error('no order ID provided.');
      }
      if (user.hasRole(ADMIN) || user.can(['read_orders', 'all_access'])) {
        payload = await this.webAppService.getOrderDetails(user, orderId);
        payload['csrfToken'] = this.utilsService.generateToken(req, res);
        res.render('orders/show', payload);
      } else {
        throw new Error('User not authorized to view order details.');
      }
    } catch (error) {
      this.logger.error(error.message, this.getOrderDetails.name);
      res.redirect('/dashboard');
    }
  }

  @Get('/products')
  public async getProducts(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {
    const payload: object = await this.webAppService.getProducts(user);
    payload['csrfToken'] = this.utilsService.generateToken(req, res);

    res.render('products/index', payload);
  }
  @Get('/productCreate')
  public async createProductPage(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response) {
    try {
      if (user.can(['all_access', 'write_products'])) {
        const payload = await this.webAppService.createProductPagePayload(user);
        payload['csrfToken'] = this.utilsService.generateToken(req, res);
        res.render('products/create', payload);
      } else {
        throw new UnauthorizedException();
      }
    } catch (error) {
      this.logger.error(error.message, this.createProductPage.name);
    }
  }
  @Get('/product-categories/children/:id')
  public async getSubCaregories(@Param('id') id: string) {
    return this.webAppService.getSubCategories(id);
  }

  @Get('/syncOrders')
  public async syncOrders(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {
    if (user.hasRole(SUPER_ADMIN) || user.hasRole(ADMIN) || user.can(['write_orders'])) {
      await this.webAppService.syncOrders(user.store_id, res);
    }
  }

  @Get('/members')
  public async getMembers(@CurrentUser() user: UserDto, @Res() res: Response, @Req() req: Request) {

    try {
      if (user.can(['all_access', 'read_members'])) {
        const payload: object = {
          ...this.webAppService.getBasePayload(user),
          members: await this.webAppService.getMembers(user.store_id),
          csrfToken: this.utilsService.generateToken(req, res),
        };
        res.render('members/index', payload);
      } else {
        throw new UnauthorizedException('User does not have permission to view members of the current store.');
      }
    } catch (error) {
      this.logger.error(error.message, this.getMembers.name);
    }
  }

  @Get('/memberRegister')
  public async registerMember(@CurrentUser() user: UserDto, @Res() res: Response, @Req() req: Request) {
    try {
      if (user.can(['write_members'])) {
        const payload: object = {
          ...this.webAppService.getBasePayload(user, false),
          previousUrl: req.headers.origin,
          csrfToken: this.utilsService.generateToken(req, res),
        };
        res.render('members/create', payload);
      } else {
        throw new Error('User has no permission to create new members.');
      }
    } catch (error) {
      this.logger.error(error.message, this.registerMember.name);
    }
  }
  @Post('/createMember')
  public async createMember(@CurrentUser() user: UserDto, @Body() newMember: RegisterUserDto, @Res() res: Response) {
    try {
      if (user.can(['all_access', 'write_members'])) {
        await this.webAppService.createMember(newMember, user.store_id);
      }
    } catch (error) {
      this.logger.error(error.message, this.createMember.name);
    }
    res.redirect('/members');
  }

  @Get('/syncStoreLocations')
  public async syncLocations(@Req() req: Request, @CurrentUser() user: UserDto, @Res() res: Response) {
    //console.log(req['user']);
    console.log(user);
    try {
      if (user.can(['all_access', 'write_locations'])) {
        const result = await this.webAppService.syncLocations(user, res);
        console.log('in controller', result);
        if (result != undefined) {
          res.json(result);
          return;
        }
        return;
      }
    } catch (error) {
      this.logger.error(error.message, this.syncLocations.name);
    }
  }

  @Get('/syncProducts')
  public async syncProducts(@Req() req: Request, @CurrentUser() user: UserDto, @Res() res: Response) {
    try {
      if (user.can(['all_access', 'write_products'])) {
        const result = await this.webAppService.syncProducts(user, res);
        if (result == true) {
          res.redirect('/products');
        }
        //res.redirect('/products');
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  @Post('/productPublish')
  public async createProduct(
    @Req() req: Request,
    @CurrentUser() user: UserDto,
    @Res() res: Response,
    @Body() product: newProductDto,
  ) {
    try {
      if (user.can(['all_access', 'write_products'])) {
        const result = await this.webAppService.createProduct(user, product);
        if (typeof result != 'boolean') {
          if(result.status == 'AUTH_REQUIRED'){
            res.send({redirect_url:result.url});
            return;
          }
          res.send({error: result.status});
          return;
        }
        console.log('this');
        res.redirect('/products');
      }
    } catch (error) {
      this.logger.error(error.message, error.stack, this.createProduct.name);
    }
  }

  //for public apps
  @Get('/billing')
  public async billing(@Req() req: Request, @CurrentUser() user: UserDto, @Res() res: Response) {
    try {
      if (user.hasRole('ADMIN') || user.hasRole('SUPER_ADMIN')) {
        const pagePayload = await this.webAppService.getBillingPagePayload(user);
        pagePayload['csrfToken'] = this.utilsService.generateToken(req, res);
        res.render('billing/index', pagePayload);
      } else {
        throw new UnauthorizedException(Error, 'Logged in user is not an admin for the specified store');
      }
    } catch (error) {
      this.logger.error(error.message, error.stack, this.billing.name);
    }
  }
  @Get('/buyPlan/:id')
  public async buyPlan(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: UserDto,
    @Param('id') id: number,
  ) {
    try {
      //const url = await this.webAppService.buyPlanForStore(user, id);
      res.redirect(await this.webAppService.buyPlanForStore(user, id));
    } catch (error) {
      this.logger.error(error.message, error.stack, this.buyPlan.name);
      res.status(500);
    }
  }
}
