import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { UserDto } from '../dtos/user.dto';
import { validate } from 'class-validator';

export const CurrentUser = createParamDecorator(
    async (data: keyof UserDto | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        const userStore = request.userStore;

        const combinedUserData = {
            ...user,
            ...userStore
        };

        // Transform to DTO
        const userDto = plainToClass(UserDto, combinedUserData, {
            enableImplicitConversion: true,
            excludeExtraneousValues: true
        });

        const errors = await validate(userDto);
        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }

        return data ? userDto[data] : userDto;
    }
);