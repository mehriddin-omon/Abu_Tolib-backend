import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateQuestionDto,
  ImportQuestionsDto,
  ListQuestionsQuery,
  UpdateQuestionDto,
} from './dto/question.dto';
import { SavollarService } from './savollar.service';

@ApiTags('admin · savollar')
@Roles('ADMIN')
@Controller('admin/questions')
export class SavollarController {
  constructor(private readonly savollar: SavollarService) {}

  @Get()
  list(@Query() q: ListQuestionsQuery) {
    return this.savollar.list(q);
  }

  @Get('stats')
  stats() {
    return this.savollar.stats();
  }

  @Post('import')
  @HttpCode(200)
  import(@Body() dto: ImportQuestionsDto) {
    return this.savollar.import(dto.csv, dto.dryRun ?? false);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.savollar.get(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.savollar.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionDto) {
    return this.savollar.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.savollar.remove(id);
  }
}
