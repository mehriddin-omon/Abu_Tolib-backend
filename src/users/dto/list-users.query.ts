import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListUsersQuery {
  @ApiPropertyOptional({ description: 'Ism yoki telefon bo\'yicha qidiruv' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  @ApiPropertyOptional({ enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' })
  @IsOptional()
  @IsIn(['STUDENT', 'ADMIN'])
  role?: 'STUDENT' | 'ADMIN';

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
