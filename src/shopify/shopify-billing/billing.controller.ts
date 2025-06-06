import { Controller, Get, Query, Res } from '@nestjs/common';

@Controller()
export class BillingController {
  @Get()
  public acceptSubscription(@Query() query: any, @Res() res: any) {
    console.log('yes');
  }
}
