import { QuestionEntity, TopicEntity } from '@my/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionEntity, TopicEntity])],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule {}
