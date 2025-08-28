import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DetailResultEntity,
  ResultEntity,
  TopicEntity,
  UserEntity
} from '@my/core';
import { ResultService } from './result.service';
import { ResultController } from './result.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResultEntity, UserEntity, DetailResultEntity, TopicEntity])], // Add your entities here if needed
  controllers: [ResultController],
  providers: [ResultService],
  exports:[TypeOrmModule]
})
export class ResultModule { }
