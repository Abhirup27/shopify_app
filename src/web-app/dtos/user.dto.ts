import { PartialType, IntersectionType } from '@nestjs/mapped-types';
import {
    IsString,
    IsEmail,
    IsNumber,
    IsOptional,
    IsArray,
    IsDate,
} from 'class-validator';
import { Expose } from 'class-transformer';
import { User } from 'src/entities/user.entity';
import { UserStore } from 'src/entities/userstore.entity';

// Create separate DTOs for each entity
class UserDetailsDto extends PartialType(User) {
    @Expose()
    @IsNumber()
    user_id: number;

    @Expose()
    @IsString()
    name: string;

    @Expose()
    @IsEmail()
    email: string;

    @Expose()
    @IsOptional()
    @IsString()
    stripe_id?: string;

    @Expose()
    @IsDate()
    email_verified_at: Date | string;
}

class UserStoreDetailsDto extends PartialType(UserStore) {
    @Expose()
    @IsNumber()
    store_id: number;

    @Expose()
    @IsString()
    role: string;

    @Expose()
    @IsOptional()
    @IsArray()
    permissions?: string[];

    // the 'this' context cannot be accessed here even if function is declared as a member function and not as a variable (arrow function) 

}

// Combine both DTOs
export class UserDto extends IntersectionType(UserDetailsDto, UserStoreDetailsDto)
{
    @Expose()
    hasRole(reqRole: string): boolean {
        //console.log(this.role)
        return this.role === reqRole;
    };

    can(reqPermissions: string[]): boolean {
        if (this.hasRole('all_access')) {
            return true;
        }

        if (!this.permissions) {
            return false;
        }

        return reqPermissions.some((permission) =>
            this.permissions?.includes(permission),
        );
    };
    // methods can be added here 
}
