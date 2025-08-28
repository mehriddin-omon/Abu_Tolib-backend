import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CreateQuestionDto, UpdateQuestionDto } from './dto';
import { QuestionService } from './question.service';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post(':topicId')
  async create(
    @Param('topicId') topicId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionService.createQuestion(topicId, createQuestionDto);
  }

  @Get()
  async findAllQuestion(@Param('topicId') topicId: string) {
    return this.questionService.findTopicQuestion(topicId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOneQuestion(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionService.deleteQuestion(id);
  }
}
