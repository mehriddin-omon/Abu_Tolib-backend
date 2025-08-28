import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectEntity, TopicEntity } from '@my/core';

@Module({
  imports: [TypeOrmModule.forFeature([SubjectEntity, TopicEntity])],
  controllers: [SubjectController],
  providers: [SubjectService],
})
export class SubjectModule {}
