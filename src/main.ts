import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'fatal', 'debug', 'warn']
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  await app.listen(app.get(ConfigService).get('port') ?? 3000);

  console.log(app.get(ConfigService).get('port'))
  console.log( app.get(ConfigService).get('database.port'))
}
bootstrap();
