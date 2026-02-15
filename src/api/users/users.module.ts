import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ResultEntity, UserEntity } from '@my/core';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ResultEntity
    ])
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }
