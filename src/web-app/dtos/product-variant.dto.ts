import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class VariantDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  compareAtPrice: number;
}

export class ProductVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @Transform(({ value, obj }) => {
    const variantTitles: string[] = Array.isArray(obj.variant_title) ? (obj.variant_title as string[]) : [];
    const skus: string[] = Array.isArray(obj.sku) ? (obj.sku as string[]) : [];
    const variantPrices: number[] = Array.isArray(obj.variant_price) ? (obj.variant_price as number[]) : [];
    const variantCaPrices: number[] = Array.isArray(obj.variant_caprice) ? (obj.variant_caprice as number[]) : [];

    const variants = [];

    for (
      let i = 0;
      i < Math.max(variantTitles.length, skus.length, variantPrices.length, variantCaPrices.length);
      i++
    ) {
      const title = variantTitles[i];
      const sku = skus[i];
      const price = variantPrices[i];
      const compareAtPrice = variantCaPrices[i];

      // Skip this variant if any of the fields are empty or undefined
      if (
        !title ||
        !sku ||
        price === undefined ||
        isNaN(price) ||
        compareAtPrice === undefined ||
        isNaN(compareAtPrice)
      ) {
        continue;
      }

      // Add complete variant to array
      variants.push({
        title,
        sku,
        price: Number(price),
        compareAtPrice: Number(compareAtPrice),
      });
    }
  })
  variants: VariantDto[];
}
