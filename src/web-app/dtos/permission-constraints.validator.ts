import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ALL_PERMS } from 'src/database/entities/constants/user-roles.constants';

@ValidatorConstraint({ name: 'isPermissionValid', async: true })
@Injectable()
export class IsPermissionValid implements ValidatorConstraintInterface {
  constructor(private configService: ConfigService) {}

  async validate(permission: string, args?: ValidationArguments): Promise<boolean> {
    const validPermissions = ALL_PERMS; //this.configService.get<string[]>('custom.default_permissions');
    return validPermissions.includes(permission);
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `Invalid Permission`;
  }
}
