import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/createTopic.dto';
import { UpdateTopicDto } from './dto/updateTopic.dto';

@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) { }1

  @Post('topic-with-questions')
  async createTopicWithQuestions(@Body() dto: CreateTopicDto) {
    return this.topicService.createTopicWithQuestions(dto);
  }
  
  @Post(':subjectId')
  async create(
    @Param('subjectId') subjectId: string,
    @Body() createTopicDto: CreateTopicDto,
  ) {
    return this.topicService.createTopic(subjectId, createTopicDto);
  }
  
  @Get()
  findAll() {
    return this.topicService.findAllTopics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topicService.findOneTopic(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTopicDto) {
    return this.topicService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topicService.delete(id);
  }
}
