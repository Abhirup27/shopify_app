import { Body, Controller, forwardRef, Get, HttpCode, HttpStatus, Inject, Post, Render, Req, Res } from '@nestjs/common';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';
import { Request, Response} from 'express';
import { AuthService } from 'src/auth/auth.service';
import { UtilsService } from 'src/utils/utils.service';
@Controller()
export class WebAppController {
  constructor(

    private readonly utilsService: UtilsService,

    @Inject(forwardRef(()=> AuthService))
    private readonly authService: AuthService
  )
  {}

    @Get()
    @Render('login')
    public async loginPage(@Req() req: Request, @Res() res : Response)
    {

  
      const token = this.utilsService.generateToken(req, res)
     //console.log(token);
        return {appName: 'Shopify App', style: '',csrfToken: token, messages: ''}
  }
    @Post('login')
    @HttpCode(HttpStatus.OK)
    public async login(@Body() body, @Req() req: Request, @Res() res : Response)
    {

      console.log(body)
      const response = await this.authService.login({ email: body.email, password: body.password });
      
      console.log("response is", response)
      return res.send(response);

    }
    @Get('/dashboard')
    public async getDashboard(@Req() req: Request, @Res() res)
    {
        //return according to the role of the user
    }

}
