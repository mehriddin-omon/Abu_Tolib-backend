import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class OptionDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @Matches(/^[A-F]$/)
  label!: string;

  @ApiProperty({ example: '$x = 3$' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  textMd!: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'TENG-04' })
  @Transform(upper)
  @IsString()
  @Matches(/^[A-Z]{2,6}-\d{2}$/, { message: "Dars kodi TENG-04 ko'rinishida bo'lsin" })
  lessonCode!: string;

  @ApiProperty({ enum: ['SINGLE_CHOICE', 'NUMERIC'] })
  @IsIn(['SINGLE_CHOICE', 'NUMERIC'])
  type!: 'SINGLE_CHOICE' | 'NUMERIC';

  @ApiProperty({ description: 'Markdown + LaTeX' })
  @IsString()
  @MinLength(3)
  @MaxLength(10_000)
  textMd!: string;

  @ApiProperty({ minimum: 1, maximum: 3, description: "1 oddiy · 2 o'rta · 3 qiyin" })
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty!: number;

  @ApiPropertyOptional({ description: "NUMERIC uchun to'g'ri javob" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  answerText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  explanationMd?: string;

  @ApiPropertyOptional({ example: 'DTM 2024' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({ type: [OptionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}

export class UpdateQuestionDto extends CreateQuestionDto {}

export class ListQuestionsQuery {
  @ApiPropertyOptional({ example: 'TENG-04' })
  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(12)
  lessonCode?: string;

  @ApiPropertyOptional({ example: 'TENG', description: "Bo'lim prefiksi" })
  @IsOptional()
  @Transform(upper)
  @IsString()
  @MaxLength(6)
  sectionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export class ImportQuestionsDto {
  @ApiProperty({ description: 'CSV matni (vergul yoki nuqta-vergul bilan)' })
  @IsString()
  @MinLength(10)
  @MaxLength(3_000_000)
  csv!: string;

  @ApiPropertyOptional({ description: 'true — faqat tekshiradi, bazaga yozmaydi' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
