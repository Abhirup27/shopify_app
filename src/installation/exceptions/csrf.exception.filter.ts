import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { HttpError } from 'http-errors';

@Catch(HttpError)
export class CsrfExceptionFilter implements ExceptionFilter {
  catch(exception: HttpError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception.message.includes('CSRF')) {
      response
        .status(403)
        .json({
          statusCode: 403,
          message: exception.message,
          error: 'Forbidden'
        });
    } else {
      // Handle other HTTP errors
      response
        .status(exception.status || 500)
        .json({
          statusCode: exception.status || 500,
          message: exception.message,
          error: exception.name
        });
    }
  }
}