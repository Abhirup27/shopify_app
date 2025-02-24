import { Body, Controller, Get, Post, Request } from '@nestjs/common';

@Controller('webhook')
export class WebhooksController {

    @Post('app/uninstalled')
    public async removeStore(@Body() req : any)
    {
        console.log(req);
    }

    @Post('orders/updated')
    public async updateOrder(@Body() req )
    {
        console.log(req);
    }
    @Post('orders/create')
    public async createOrder(@Body() req)
    {
        console.log(req);
    }

    @Post('products/update')
    public async updateProduct(@Body() req: any)
    {
        //console.log(req);
    }

}
