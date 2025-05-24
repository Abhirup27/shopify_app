import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class InventoryDto {
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class VariantDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  compareAtPrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryDto)
  @IsOptional()
  inventory?: InventoryDto[];
}
