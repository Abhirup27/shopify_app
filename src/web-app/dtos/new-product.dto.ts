import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProductVariantsDto } from './product-variant.dto';

export class newProductDto extends ProductVariantsDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsNotEmpty()
  @IsString()
  product_type: string;

  /* @IsOptional()
  @IsString()
  product_type_2?: string;

  @IsOptional()
  @IsString()
  product_type_3?: string;
*/
  @IsNotEmpty()
  @IsString()
  vendor: string;

  @IsOptional()
  @Transform(({ value }): string[] => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
      return value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }

    return [];
  })
  tags: string[];

  @IsOptional()
  _csrf?: string;
}
