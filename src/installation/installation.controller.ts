import { BadRequestException, Controller, Get, Query, Req, Request, Res, Response, UnauthorizedException, UseFilters, ValidationPipe } from '@nestjs/common';
import { InstallationService } from './providers/installation.service';
import { UtilsService } from 'src/utils/providers/utils.service';
import { ConfigService } from '@nestjs/config';
import { GetInstallInitQueryDto } from './dtos/get-install-query.dto';
import { GetInstallCodeDto } from './dtos/get-code-query.dto';
import { UnauthorizedExceptionFilter } from './exceptions/hmac.exception.filter';


@Controller() //@Controller('/shopify/auth')
export class InstallationController {

    private clientId: string;
    private accessScopes: string;
    private redirectUri: string;

    constructor(
    private readonly installationService: InstallationService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
    ) {
        this.clientId = configService.get('shopify_api_key');
        this.accessScopes = configService.get('shopify_api_scopes');
        this.redirectUri = configService.get('app_install_URL');
    }

    // I have enabled global pipes, I may need to have custom ValidationPipes for some routes.
    //@Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @Get('/')
    @UseFilters(UnauthorizedExceptionFilter)
    public async startInstallation(@Request() request: Request, @Query() query: GetInstallInitQueryDto, @Res() response)
    {
        try
        {
            const shop = query.shop;
            const endpoint = `https://${shop}/admin/oauth/authorize?client_id=${this.clientId}&scope=${this.accessScopes}&redirect_uri=${this.redirectUri}`;

            const validRequest = await this.utilsService.validateRequestFromShopify(query);
            if (validRequest) {

                //check query.shop if it is made optional or according to the global Validation config
                const storeDetails = await this.utilsService.getStoreByDomain(query.shop);

                if (storeDetails !== null) {
                    //store exists in the app's DB
                    const validToken = await this.installationService.isAccessTokenValid(storeDetails);
                    if (validToken) {

                        const isEmbedded = this.utilsService.isAppEmbedded();
                        if (isEmbedded) {
                            //handle embedded apps
                        }
                        else {
                            response.redirect('/');
                        }
                    }
                    else {

                        return response.redirect(endpoint)
                    }

                }
                else {
                    
                    console.log(endpoint)
                    return response.redirect(303, endpoint); //There are other ways to redirect, need to understand them.
                }
            }
            else
            {
                throw new UnauthorizedException({
                status: 401,
                error: 'Unauthorized',
                message: 'Invalid HMAC signature',
                details: {
                    reason: 'HMAC verification failed',
                    //requestId: 'xyz123' // if you want to include request tracking
                }
                });
            }
        }
        catch (error)
        {
            if (error instanceof UnauthorizedException)
            {
                console.log('invalid HMAC:', error['details'].reason);
                throw error
            }
             
        }
    }

    @Get('/redirect')
    public async install(@Request() request: Request, @Query() query: GetInstallCodeDto, @Res() response)
    {


        const validRequest = await this.utilsService.validateRequestFromShopify(query);

        if (validRequest)
        {
            const shop = query.shop; const code = query.code;

            const accessToken = await this.installationService.getAccessTokenForStore(shop, code);
        
            console.log(query);
            console.log("THIS IS THE ACESS TOKEN", accessToken)
            
            if (accessToken != false  && accessToken.length > 0)
            {
                const shopDetails = await this.installationService.getShopDetailsFromShopify(shop, accessToken);
                
                const storeToDB = this.installationService.saveStoreDetails(shopDetails, accessToken);

                console.log(shopDetails)
                if (storeToDB)
                {
                    const isEmbedded = this.utilsService.isAppEmbedded();

                    if (isEmbedded)
                    {
                    
                    }
                    else
                    {
                        //redirect to login page of the app
                        //response.redirect('/login');
                        response.redirect('/')
                    }
                }
            }
        }
    }

}