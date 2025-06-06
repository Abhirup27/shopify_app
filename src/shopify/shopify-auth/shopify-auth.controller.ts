import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Request,
  Res,
  Response,
  UnauthorizedException,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { ShopifyAuthService } from './shopify-auth.service';
import { UtilsService } from 'src/utils/utils.service';
import { ConfigService } from '@nestjs/config';
import { GetInstallInitQueryDto } from './dtos/get-install-query.dto';
import { GetInstallCodeDto } from './dtos/get-code-query.dto';
import { UnauthorizedExceptionFilter } from '../../filters/hmac.exception.filter';
import { JobsService } from 'src/jobs/jobs.service';
import { Store } from '../../database/entities/store.entity';

/**
 * These routes need to be allowed in the shopify app's configuration
 * */
@Controller() //@Controller('/shopify/auth')
@UseFilters(UnauthorizedExceptionFilter)
export class ShopifyAuthController {
  private readonly logger: Logger = new Logger(ShopifyAuthController.name);

  private clientId: string;
  private accessScopes: string;
  private redirectUri: string;

  constructor(
    private readonly installationService: ShopifyAuthService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
  ) {
    this.clientId = configService.get('shopify_api_key');
    this.accessScopes = configService.get('shopify_api_scopes');
    this.redirectUri = configService.get('app_install_URL');
  }

  /**
   *Initial route that shopify sends request to when a store owner wants to install the app.
   *It checks if the store already exists in the database or not. If not, it redirects to /shopify/auth/redirect to carry out the installation.
   * */
  @Get('/')
  public async startInstallation(@Request() request: Request, @Query() query: GetInstallInitQueryDto, @Res() response) {
    try {
      const shop: string = query.shop;
      const endpoint = `https://${shop}/admin/oauth/authorize?client_id=${this.clientId}&scope=${this.accessScopes}&redirect_uri=${this.redirectUri}`;
      console.log(query);
      const validRequest: boolean = await this.utilsService.validateRequestFromShopify(query);
      if (validRequest) {
        //check query.shop if it is made optional, or according to the global Validation config
        const storeDetails: Store = await this.utilsService.getStoreByDomain(query.shop);

        if (storeDetails !== null && storeDetails.myshopify_domain == query.shop) {
          //store exists in the app's DB
          const validToken: boolean = await this.installationService.isAccessTokenValid(storeDetails);
          if (validToken) {
            // const store: Store = await this.jobsService.updateStore(storeDetails);
            const isEmbedded: boolean = this.utilsService.isAppEmbedded();
            if (isEmbedded) {
              //handle embedded apps
            } else {
              response.redirect('/');
            }
          } else {
            const endpoint: string = await this.installationService.getOAuthURL(this.clientId, shop);
            return response.redirect(endpoint);
          }
        } else {
          //console.log(endpoint)
          const url: string = await this.installationService.getOAuthURL(this.clientId, shop);
          const urlObj = new URL(url);
          const nonce: string = urlObj.searchParams.get('state');

          // Set signed cookie with nonce
          response.cookie('shopify.oauth.state', nonce, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            signed: true,
            maxAge: 60 * 60 * 1000, // 1 hour expiry
          });
          console.log(url);

          return response.redirect(303, url);
        }
      } else {
        this.logger.warn(`HMAC isn't from Shopify`);

        throw new UnauthorizedException({
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid HMAC signature',
          details: {
            reason: 'HMAC verification failed',
            //requestId: 'xyz123' //  include request tracking
          },
        });
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        // console.log('invalid HMAC:', error);
        throw error;
      }
    }
  }
  /**
   * This route handles the installation.
   * */
  @Get('/redirect')
  public async install(@Request() request: Request, @Query() query: GetInstallCodeDto, @Res() response) {
    //console.log(request)
    try {
      const validateHMAC: boolean = await this.utilsService.validateRequestFromShopify(query);
      const validateNonce: boolean = await this.installationService.validateNonce(query.state, query.shop);
      if (validateHMAC && validateNonce) {
        const shop: string = query.shop;
        const code: string = query.code;

        const accessToken = await this.installationService.getAccessTokenForStore(shop, code);
        if (accessToken != false && accessToken.length > 0) {
          const shopDetails = (await this.installationService.getShopDetailsFromShopify(shop, accessToken)).respBody;
          console.log(shopDetails);
          const storeToDB = await this.installationService.saveStoreDetails(shopDetails['shop'], accessToken);

          this.jobsService.configure(storeToDB.table_id);

          //console.log(shopDetails)
          if (storeToDB.success) {
            this.logger.log(
              `App succesfully installed for store ${shopDetails.shop.domain} and stored to the Database.`,
            );

            const isEmbedded = this.utilsService.isAppEmbedded();

            if (isEmbedded) {
            } else {
              //redirect to login page of the app
              //response.redirect('/login');
              return response.redirect('/');
            }
          } else {
            //failed to store all details in DB
          }
        } else {
          this.logger.debug(
            `Installation failed. Failed to retrieve access token for code ${code} and shop domain ${shop}.`,
          );
          throw new UnauthorizedException({
            status: 401,
            error: 'Unauthorized',
            message: 'Invalid code or shop domain',
            details: {
              reason: 'failed to retrieve access token for the specified store',
              //requestId: 'xyz123' // include request tracking
            },
          });
        }
      } else {
        if (validateNonce == false) {
          console.log('invalid nonce');
        }
        this.logger.warn(`HMAC isn't from Shopify`);
        throw new UnauthorizedException({
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid HMAC signature',
          details: {
            reason: 'HMAC verification failed',
            //requestId: 'xyz123' // include request tracking
          },
        });
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        //console.log('invalid HMAC:', error);
        throw error;
      }
    }
  }
  /**
   * I use this route to re authenticate the access token for a store when a query to shopify return 401 error code.
   * */
  @Get('/updateStoreToken')
  public async updateToken(@Req() request: Request, @Res() response, @Query() query) {
    try {
      const validateHMAC: boolean = await this.utilsService.validateRequestFromShopify(query);
      const validateNonce: boolean = await this.utilsService.validateNonce(query.state, query.shop);
      if (validateHMAC && validateNonce) {
        const shop: string = query.shop;
        const code: string = query.code;
        const accessToken = await this.installationService.getAccessTokenForStore(shop, code);
        if (accessToken != false && accessToken.length > 0) {
          const stores: Store[] = await this.utilsService.getAllStoresByDomain(shop);

          if (stores.length > 0) {
            let store: Store = stores[0];
            if (stores.length > 1) {
              store = await this.installationService.getShopDetailsFromShopify(shop, accessToken);
            }
            const updateAccessToken = await this.installationService.updateAccessToken(store, accessToken);
            //console.log(updateAccessToken);
            console.log(accessToken);
            await this.jobsService.resumePausedJobsForStore(shop, accessToken);
            response.redirect('/dashboard');
          } else {
            //store doesn't exist in DB
          }
        }
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }
}
