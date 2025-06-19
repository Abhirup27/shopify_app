import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  minLength,
  MinLength,
  Validate,
} from 'class-validator';
import { IsPermissionValid } from './permission-constraints.validator';
import { Transform, Type } from 'class-transformer';
import { Match } from '../decorators/match.decorator';
export class RegisterUserDto {
  @IsNotEmpty({ message: 'E-mail is required' })
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @MinLength(3, { message: 'Email must be at least 3 characters long.' })
  @MaxLength(100, { message: 'Email cannot be more than 100 characters long.' })
  email: string;

  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot be longer than 100 characters' })
  name: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(3, { message: 'Password must  be at least 3 characters long' })
  @MaxLength(100, { message: 'Password cannot be longer than 100 characters long.' })
  password: string;

  @IsNotEmpty({ message: 'Password confirmation is required' })
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  passwordConfirmation: string;

  //@IsNotEmpty({ message: 'isAdmin should not be empty' })
  @Transform(({ value }) => {
    //I had to do this because the fetch logic in the create member page changes the check box's boolean value to string
    if (typeof value == 'object' || value === 'true' || value === true || value === '1' || value === 'on')
      return 'true';
    if (value === 'false' || value === false || value === '0' || value === '' || value === undefined) return 'false';
    return value;
  })
  @IsString({ message: 'isAdmin must be a string value' })
  isAdmin?: string;

  @IsArray()
  @ArrayNotEmpty({
    message: 'You need to provide at least one valid permission for the registration fo the new member',
  })
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Validate(IsPermissionValid, { each: true, message: 'Invalid Permission' })
  @Transform(({ value }) => (Array.isArray(value) ? [...new Set(value)] : value)) // The Set() handles the distinct validation
  permissions: string[];
}
