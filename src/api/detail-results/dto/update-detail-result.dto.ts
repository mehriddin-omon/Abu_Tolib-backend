import { PartialType } from '@nestjs/mapped-types';
import { CreateDetailResultDto } from './create-detail-result.dto';

export class UpdateDetailResultDto extends PartialType(CreateDetailResultDto) {}
