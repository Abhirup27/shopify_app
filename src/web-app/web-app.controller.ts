import {
  Body,
  Controller,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Render,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AccessTokenGuard, Public } from 'src/auth/guards/access-token.guard';
import { UtilsService } from 'src/utils/utils.service';
import { UserService } from './user/user.service';
import { StoreContextGuard } from './store-context.guard';
import { WebAppService } from './web-app.service';
import { CurrentUser } from './decorators/user.decorator';
import { UserDto } from './dtos/user.dto';
import { ADMIN, SUPER_ADMIN } from 'src/database/entities/constants/user-roles.constants';
import { RegisterUserDto } from './dtos/register-member.dto';
import { newProductDto } from './dtos/new-product.dto';

@UseGuards(AccessTokenGuard, StoreContextGuard)
@Controller()
export class WebAppController {
  private readonly logger = new Logger(WebAppController.name);
  constructor(
    private readonly webAppService: WebAppService,
    private readonly utilsService: UtilsService,

    private readonly userService: UserService,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Get()
  @Render('login')
  public async loginPage(@Req() req: Request, @Res() res: Response) {
    const token: string = this.utilsService.generateToken(req, res);
    //console.log(token);
    return {
      appName: 'Shopify App',
      style: '',
      csrfToken: token,
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
      sameSite: 'strict',
      maxAge: 1 * 60 * 60 * 1000, // 1 hour
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

    const token = this.utilsService.generateToken(req, res);

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
  @Get('/syncOrders')
  public async syncOrders(@CurrentUser() user: UserDto, @Req() req: Request, @Res() res: Response, @Query() query) {
    if (user.hasRole(SUPER_ADMIN) || user.hasRole(ADMIN) || user.can(['write_orders'])) {
      await this.webAppService.syncOrders(user.store_id, res);
    }
  }

  @Get('/members')
  public async getMembers(@CurrentUser() user: UserDto, @Res() res: Response, @Req() req: Request) {
    const payload: object = {};
    try {
      if (user.can(['all_access', 'read_members'])) {
        payload['members'] = await this.webAppService.getMembers(user.store_id);
        payload['csrfToken'] = this.utilsService.generateToken(req, res);
        payload['user'] = user;
        payload['appName'] = 'Shopify app';
        payload['style'] = '';
        payload['isEmbedded'] = false;
        payload['showSidebar'] = true;
        payload['storeId'] = user.store_id;
        payload['isStorePublic'] = true;
        payload['body'] = '';
      } else {
        throw new Error('User does not have permission to view members of the current store.');
      }
    } catch (error) {
      this.logger.error(error.message, this.getMembers.name);
    }
    res.render('members/index', payload);
  }

  @Get('/memberRegister')
  public async registerMember(@CurrentUser() user: UserDto, @Res() res: Response, @Req() req: Request) {
    try {
      if (user.can(['write_members'])) {
        const payload: object = {};
        payload['previousUrl'] = req.headers.origin;
        payload['user'] = user;
        payload['csrfToken'] = this.utilsService.generateToken(req, res);
        payload['appName'] = 'SHopify App';
        payload['style'] = '';
        payload['isEmbedded'] = false;
        payload['showSidebar'] = true;
        payload['body'] = '';
        payload['isStorePublic'] = true;
        payload['storeId'] = user.store_id;

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
    //console.log(req['user']);// console.log(user);
    try {
      if (user.can(['all_access', 'write_locations'])) {
        const result = await this.webAppService.syncLocations(user);
        console.log(result);
        res.json(result);
      }
    } catch (error) {
      this.logger.error(error.message, this.syncLocations.name);
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
      console.log('here');
      if (user.can(['all_access', 'write_products'])) {
        const result: boolean = await this.webAppService.createProduct(user, product);
      }
    } catch (error) {
      this.logger.error(error.message, this.createProduct.name);
    }
  }
}
