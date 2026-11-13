import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppConfig } from './config/app-config.service';

export const API_PREFIX = 'api/v1';

/** main.ts va e2e testlar bir xil sozlamadan foydalanadi */
export function setupApp(app: INestApplication) {
  const config = app.get(AppConfig);
  const express = app as NestExpressApplication;

  // Caddy ortida — haqiqiy IP X-Forwarded-For'dan olinadi
  express.set('trust proxy', 1);
  app.setGlobalPrefix(API_PREFIX, { exclude: [] });
  app.use(helmet());
  app.use(cookieParser());
  // CSV import va uzun konspektlar uchun (standart 100kb yetmaydi)
  express.useBodyParser('json', { limit: '4mb' });
  app.enableCors({ origin: config.get('WEB_URL'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED')) {
    const doc = new DocumentBuilder()
      .setTitle('Abu Tolib API')
      .setDescription('Milliy sertifikat (matematika) diagnostika platformasi')
      .setVersion('0.1.0')
      .addCookieAuth('at')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, SwaggerModule.createDocument(app, doc));
  }
  return config;
}
