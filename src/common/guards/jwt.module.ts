import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GuardService } from './jwt-auth.guard';
import { config } from '@my/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: config.JWT_ACCESS_SECRET,
        signOptions: {
          expiresIn: config.JWT_ACCESS_TIME,
        },
      }),
    }),
  ],
  providers: [GuardService],
  exports: [GuardService, JwtModule],
})
export class GuardModule {}
