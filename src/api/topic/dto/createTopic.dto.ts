import { Type } from 'class-transformer';
import {IsArray, IsNotEmpty, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateQuestionDto } from 'src/api/question';

export class CreateTopicDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  subjectId: string;
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
