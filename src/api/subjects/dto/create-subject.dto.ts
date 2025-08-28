import { TopicEntity } from '@my/core';
import { IsEmpty, IsNotEmpty } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  name: string;

  @IsEmpty()
  topics?: Partial<TopicEntity>[];
}
