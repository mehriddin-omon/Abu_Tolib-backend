import { PartialType } from '@nestjs/mapped-types';
import { CreateTopicDto } from './createTopic.dto';

export class UpdateTopicDto extends PartialType(CreateTopicDto) {}
