import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity, ResultEntity, SubjectEntity, TopicEntity } from '@my/core';
import { TopicService } from './topic.service';
import { TopicController } from './topic.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TopicEntity, SubjectEntity, QuestionEntity, ResultEntity])],
  controllers: [TopicController],
  providers: [TopicService],
  exports: [TypeOrmModule],
})
export class TopicsModule {}
