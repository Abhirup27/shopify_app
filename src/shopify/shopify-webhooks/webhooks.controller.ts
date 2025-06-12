import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { HashVerificationGuard } from '../guards/hash-verification.guard';
import { Request } from 'express';
import { DataService } from 'src/data/data.service';

@Controller() //@Controller('webhook')
@UseGuards(HashVerificationGuard)
export class WebhooksController {
    constructor(
      private readonly dataService: DataService,
    ) {
    }
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
    @Post('subscription_billing_attempts/success')
  public async  createSubscriptionById(@Body() req: any)
    {
      console.log(req);
    }
  @Post('app_subscriptions/update')
  public async updateSubscriptionById(@Body() body: any, @Req() req: Request)
  {
    //console.log(req.rawBody);
    await this.dataService.setPlanState(body.app_subscription);
    console.log(body);

  }


}
