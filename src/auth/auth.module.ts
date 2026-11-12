import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../config/app-config.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { LoginService } from './login.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { issuer: 'abu-tolib' },
        verifyOptions: { issuer: 'abu-tolib' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [LoginService, TokenService],
  exports: [LoginService, TokenService],
})
export class AuthModule {}
