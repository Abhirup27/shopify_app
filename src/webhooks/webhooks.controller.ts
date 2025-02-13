import { Body, Controller, Get, Post, Request } from '@nestjs/common';

@Controller('webhook')
export class WebhooksController {

    @Post('app/uninstalled')
    public async removeStore(@Body() req : any)
    {
        console.log(req);
    }

}
