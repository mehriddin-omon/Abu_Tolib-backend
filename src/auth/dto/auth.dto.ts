import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class PollLoginDto {
  @ApiProperty()
  @IsUUID()
  requestId: string;

  @ApiProperty()
  @IsString()
  @Length(20, 100)
  pollSecret: string;
}

export class ExchangeLoginDto {
  @ApiProperty({ description: 'Bot xabaridagi "Saytga qaytish" havolasidagi t parametri' })
  @IsString()
  @Length(20, 100)
  token: string;
}

export class DevLoginDto {
  @ApiProperty({ example: '998901234567' })
  @Matches(/^\+?\d{9,15}$/)
  phone: string;

  @ApiPropertyOptional({ example: 'Test' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @ApiPropertyOptional({ enum: ['STUDENT', 'ADMIN'] })
  @IsOptional()
  @IsIn(['STUDENT', 'ADMIN'])
  role?: 'STUDENT' | 'ADMIN';
}
