import { ExceptionFilter, Catch, ArgumentsHost, RequestTimeoutException } from '@nestjs/common';
import { Response } from 'express';

@Catch(RequestTimeoutException)
export class RequestExceptionFilter implements ExceptionFilter {
  catch(exception: RequestTimeoutException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(401).json({
      exception
    });
  }
}