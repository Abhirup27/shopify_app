import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { DataService } from '../../data/data.service';
import { BillingDto } from './billing.dto';
import { Response } from 'express';
@Controller()
export class BillingController {
  constructor(private readonly dataService: DataService){}
  @Get()
  public async acceptSubscription(@Query() query: BillingDto, @Res() res: Response) {
    console.log(query);

    //res.status(HttpStatus.OK);
    await this.dataService.setPlan(query.planId,query.userId, query.storeId, query.charge_id.toString() );

    await this.dataService.setPendingSubs(query.charge_id.toString(), '0');

    res.redirect(`/billing`);
  }
}
