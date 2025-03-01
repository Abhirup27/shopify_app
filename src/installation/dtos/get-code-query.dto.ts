import { PartialType, PickType, OmitType } from '@nestjs/mapped-types';
import { GetInstallInitQueryDto } from './get-install-query.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetInstallCodeDto extends GetInstallInitQueryDto
{
    @IsNotEmpty()
    @IsString()
    code: string;

    @IsString()
    @IsOptional()
    state?: string;

}

/**
 * export class GetInstallCodeDto extends OmitType(GetInstallInitQueryDto, ['hmac'])
*{
 *   @IsNotEmpty()
  *  @IsString()
   * code: string;
*
*}
 */