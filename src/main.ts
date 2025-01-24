import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DataSourceOptions } from 'typeorm';
import { createDatabase } from 'typeorm-extension';

import { CustomLogger } from './custom-logger/CustomLogger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { doubleCsrf } from 'csrf-csrf';
import * as cookieParser from 'cookie-parser';
import { CsrfExceptionFilter } from './filters/csrf.exception.filter';
import { CsrfMiddleware } from './middlewares/csrf.middleware';

async function bootstrap() {
  const options: DataSourceOptions = {
    host:'localhost',
    type: 'mysql',
    database: 'shopify_app',
    username: 'root',
    password: 'ABHIrup_27',
    };

    //This just creates the shopify_app Database
    await createDatabase({
      options,
      ifNotExist:true
    });


  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    //bufferLogs: true,
    logger: ['log', 'error', 'fatal', 'debug', 'warn']
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  //app.useGlobalFilters(new CsrfExceptionFilter());
  
  const configService = app.get(ConfigService);
  const logger = new CustomLogger(configService);
  app.useLogger(logger);
  
  app.use(cookieParser());
 
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');

  await app.listen(configService.get('port') ?? 3000);



  process.on('SIGINT', async () => {
    try {
      logger.log('Received SIGINT signal. Gracefully shutting down...');
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    try {
      logger.log('Received SIGTERM signal. Gracefully shutting down...');
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

}
bootstrap();
