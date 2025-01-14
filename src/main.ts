import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'fatal', 'debug', 'warn']
  });


  await app.listen(app.get(ConfigService).get('port') ?? 3000);

  console.log(app.get(ConfigService).get('port'))
  console.log( app.get(ConfigService).get('database.port'))
}
bootstrap();
