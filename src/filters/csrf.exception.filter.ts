import { Catch, ArgumentsHost, HttpException, UnauthorizedException, ExceptionFilter } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
@Catch(HttpException)
export class CsrfExceptionFilter extends BaseExceptionFilter  {
  catch(exception: any, host: ArgumentsHost) {
    //console.log('hello123')
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception.code === 'EBADCSRFTOKEN') {
      return response.status(403).json({
        statusCode: 403,
        message: 'Invalid CSRF token',
        error: 'Forbidden'
      });
    }
    else if(exception.message === "Cannot read properties of undefined (reading 'x-csrf-token')")
    {

      return response.status(403).json({
        statusCode: 403,
        message: 'CSRF token not found',
        error: 'Forbidden'
      });
    }

    //console.log(exception)
   super.catch(exception, host);
  }
}