import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsUrl,
  IsDateString,
  IsOptional,
  IsArray,
  IsIn,
  ValidateNested,
  Length,
  Matches,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateShopDTO {
  [key: string]: any;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  id: number;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  province?: string | null;

  @IsString()
  @Length(2, 2)
  country: string;

  @IsOptional()
  @IsString()
  address1?: string | null;

  @IsOptional()
  @IsString()
  zip?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;


  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  address2?: string | null;

  // @IsDateString()
  // createdAt: string;
  //
  // @IsDateString()
  // updatedAt: string;

  // @IsString()
  // @Length(2, 2)
  // countryCodeV2: string;

  // @IsString()
  // country_name: string;

  // @IsString()
  // @Length(3, 3)
  // currencyCode: string;

  // @IsString()
  // shopOwnerName: string;

  // @IsOptional()
  // @IsString()
  // provinceCode: string | null;

  @IsString()
  //@Matches(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
  myshopifyDomain: string;

}
