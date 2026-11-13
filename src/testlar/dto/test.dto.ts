import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const TEST_KINDS = ['DIAGNOSTIC', 'SECTION_FINAL', 'PRACTICE'] as const;

export class CreateTestDto {
  @ApiProperty({ enum: TEST_KINDS })
  @IsIn(TEST_KINDS)
  kind!: (typeof TEST_KINDS)[number];

  @ApiProperty({ example: 'Kirish diagnostikasi' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ description: 'SECTION_FINAL uchun majburiy' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ description: "Daqiqa; bo'sh — cheklovsiz" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  timeLimitMin?: number;
}

export class UpdateTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  sectionId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(300)
  timeLimitMin?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class SetTestQuestionsDto {
  @ApiProperty({ type: [String], description: "Tartib — massivdagi o'rni" })
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  questionIds!: string[];
}

export class AutoAssembleDto {
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;
}
