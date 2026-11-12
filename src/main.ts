import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_PREFIX, setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = setupApp(app);
  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');
  Logger.log(`API: http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
  if (config.get('SWAGGER_ENABLED')) {
    Logger.log(`Swagger: http://localhost:${port}/${API_PREFIX}/docs`, 'Bootstrap');
  }
}
void bootstrap();
