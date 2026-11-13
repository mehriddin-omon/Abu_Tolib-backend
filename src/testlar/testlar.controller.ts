import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AutoAssembleDto, CreateTestDto, SetTestQuestionsDto, UpdateTestDto } from './dto/test.dto';
import { TestlarService } from './testlar.service';

@ApiTags('admin · testlar')
@Roles('ADMIN')
@Controller('admin/tests')
export class TestlarController {
  constructor(private readonly testlar: TestlarService) {}

  @Get()
  list() {
    return this.testlar.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.testlar.get(id);
  }

  @Post()
  create(@Body() dto: CreateTestDto) {
    return this.testlar.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestDto) {
    return this.testlar.update(id, dto);
  }

  @Put(':id/questions')
  setQuestions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetTestQuestionsDto) {
    return this.testlar.setQuestions(id, dto.questionIds);
  }

  @Post(':id/auto')
  @HttpCode(200)
  auto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AutoAssembleDto) {
    return this.testlar.autoAssemble(id, dto.count ?? 30);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testlar.remove(id);
  }
}
