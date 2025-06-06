import { IsNotEmpty, IsNumber, IsString } from 'class-validator';


export class BillingDto {

  @IsNumber()
  @IsNotEmpty()
  planId: number;

  @IsNumber()
  @IsNotEmpty()
  charge_id: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  storeId: number;
}