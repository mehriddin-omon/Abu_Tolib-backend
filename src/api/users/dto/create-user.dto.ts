import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  birthDate: Date;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
