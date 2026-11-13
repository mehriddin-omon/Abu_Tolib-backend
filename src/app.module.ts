import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { KontentModule } from './kontent/kontent.module';
import { SavollarModule } from './savollar/savollar.module';
import { TelegramModule } from './telegram/telegram.module';
import { TestlarModule } from './testlar/testlar.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      // E2E testlarda limit o'chiq (bir test ichida o'nlab kirish bo'ladi)
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    UsersModule,
    AuthModule,
    TelegramModule,
    // 2-qadam: kontent va savollar banki
    KontentModule,
    SavollarModule,
    TestlarModule,
    // Keyingi qadamlarda: DiagnostikaModule ...
  ],
  controllers: [HealthController],
  providers: [
    // Tartib muhim: avval limit, keyin kirish, keyin rol
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
