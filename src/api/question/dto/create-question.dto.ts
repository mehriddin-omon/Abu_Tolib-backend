import { QuestionLevel, QuestionTime, QuestionType } from '@my/common';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf, ValidateNested } from 'class-validator';
import { CreateVariantDto } from 'src/api/variant';

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsEnum(QuestionType, { 
    message: 'Type must be a valid QuestionType' 
  })
  type: QuestionType;

  @IsNotEmpty()
  @IsEnum(QuestionLevel, {
    message: 'Level must be one of easy, medium, or hard',
  })
  level: QuestionLevel;

  @IsOptional()
  @IsEnum(QuestionTime, {
    message: 'Time must be one of short, medium, or long',
  })
  time?: QuestionTime;

  // Optional image URL
  @IsOptional()
  @IsUrl({}, { message: 'imgUrl must be a valid URL' })
  imgUrl?: string;

  // Optional tags array
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Variants - savolga qarab optional yoki required
  @ValidateIf(o => o.type === QuestionType.MULTIPLE)
  @IsArray()
  @ValidateNested({each: true})
  @Type(()=> CreateVariantDto)
  variants?: CreateVariantDto[];
}