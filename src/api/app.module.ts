import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { config } from '@my/config';
import { GuardService } from '@my/common';
import { AuthModule } from './auth';
import { UsersModule } from './users';
import { SubjectModule } from './subjects';
import { TopicsModule } from './topic';
import { VariantModule } from './variant';
import { QuestionModule } from './question';
import { ResultModule } from './result/result.module';
import { DetailResultsModule } from './detail-results/detail-results.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DB_URL'),
        autoLoadEntities: true,
        synchronize: config.NODE_ENV === 'development', //
        // logging: config.NODE_ENV === 'development' ? ['query', 'error']:['error'], // Enable logging in development})
        retryAttempts: 3, // Retry connection attempts
      }),
    }),

    // AdminModule,
    AuthModule,
    UsersModule,
    SubjectModule,
    TopicsModule,
    QuestionModule,
    VariantModule,
    ResultModule,
    DetailResultsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GuardService,
    },
  ],
  exports: [],
})
export class AppModule {}
