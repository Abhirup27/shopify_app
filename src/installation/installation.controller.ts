import { Controller, Get, Query, Req, Request, Res, Response, ValidationPipe } from '@nestjs/common';
import { InstallationService } from './providers/installation.service';
import { UtilsService } from 'src/utils/providers/utils.service';
import { ConfigService } from '@nestjs/config';
import { GetInstallInitQueryDto } from './dtos/get-install-query.dto';
import { GetInstallCodeDto } from './dtos/get-code-query.dto';


@Controller() //@Controller('/shopify/auth')
export class InstallationController {

    constructor(
    private readonly installationService: InstallationService,
    private readonly utilsService: UtilsService,
    private readonly configService: ConfigService,
  ) {}

    // I have enabled global pipes, I may need to have custom ValidationPipes for some routes.
    //@Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @Get('/')
    public async startInstallation(@Request() request: Request, @Query() query: GetInstallInitQueryDto, @Res() response)
    {

        const validRequest = await this.utilsService.validateRequestFromShopify(query);

        if (validRequest)
        {

            //check query.shop if it is made optional or according to the global Validation config
            const storeDetails = await this.utilsService.getStoreByDomain(query.shop);

            if (storeDetails !== null) 
            {
                //store exists in the DB
                const validToken = await this.installationService.isAccessTokenValid(storeDetails);

            }
            else
            {
                const shop = query.shop;
                const clientId = this.configService.get('shopify_api_key'); const accessScopes = this.configService.get('shopify_api_scopes');
                const redirectUri = this.configService.get('app_install_URL');

                const endpoint = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${accessScopes}&redirect_uri=${redirectUri}`;

                return response.redirect(303, endpoint); //There are other ways to redirect, need to understand them.
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
