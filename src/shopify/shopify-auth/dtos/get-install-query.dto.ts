import { IsHash, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * Data Transfer Object when someone installs the app from the shopify app store or accesses it, these two params get passed
 */
export class GetInstallInitQueryDto {
  @IsNotEmpty()
  @IsUrl()
  shop: string;

  @IsNotEmpty()
  @IsHash('sha256')
  hmac: string;

  @IsNotEmpty()
  @IsString()
  host: string;

  //     @IsNotEmpty()
  // @IsNumber()
  // @Type(()=> Number)
  // timestamp: number;
  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @IsOptional()
  @IsString()
  session?: string;
  // @IsNotEmpty()
  // @IsString()
  // code: string;
}
