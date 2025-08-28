import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UUIDInterceptor } from 'src/infrastructure';
import { config, corsConfig } from '@my/config';

export default class Application {
  private static readonly logger = new Logger(Application.name);

  public static async main(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    const environment = config.NODE_ENV || 'development';
    app.enableCors(corsConfig[environment]);

    const apiPrefix = 'api/v1';
    app.setGlobalPrefix(apiPrefix);

    const port = config.APP_PORT || 8080;
    const logLevels: LogLevel[] =
      environment === 'production'
        ? ['error']
        : ['error', 'warn', 'log', 'debug', 'verbose'];

    app.useLogger(logLevels);
    app.useGlobalInterceptors(new UUIDInterceptor()); //:id ning UUID bo'lishiga javobgar funktsiya
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
      }),
    );
    await app
      .listen(port, () => {
        Application.logger.log(
          `Application is running on: http://localhost:${port}/${apiPrefix}`,
        );
      })
      .catch((error) => {
        Application.logger.error(
          `Failed to start the application: ${(error as Error).message}`,
          (error as Error).stack,
        );
        process.exit(1); // Exit the process if the application fails to start
      });
  }
}
