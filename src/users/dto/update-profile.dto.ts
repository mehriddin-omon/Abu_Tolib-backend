import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Dilnoza' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rahimova' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @ApiPropertyOptional({ example: 11, description: 'Sinf (5–11) yoki 12 — bitirgan' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ example: 'Navoiy' })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  region?: string;

  @ApiPropertyOptional({ example: 65, description: 'Maqsad ball' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  targetScore?: number;
}
