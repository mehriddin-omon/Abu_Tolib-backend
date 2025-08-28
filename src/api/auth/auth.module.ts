import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@my/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GuardModule, TokenService } from '@my/common';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), GuardModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
})
export class AuthModule {}
