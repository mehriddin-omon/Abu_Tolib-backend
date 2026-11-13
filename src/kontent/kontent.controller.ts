import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateLessonDto, UpdateSectionDto } from './dto/kontent.dto';
import { KontentService } from './kontent.service';

/** Talaba: bo'limlar va e'lon qilingan darslar */
@ApiTags('kontent')
@Controller()
export class KontentController {
  constructor(private readonly kontent: KontentService) {}

  @Get('sections')
  sections() {
    return this.kontent.publicTree();
  }

  @Get('lessons/:code')
  lesson(@Param('code') code: string) {
    return this.kontent.getLesson(code.toUpperCase(), true);
  }
}

/** O'qituvchi: bo'lim nomlari, konspekt tahriri, e'lon qilish */
@ApiTags('admin · kontent')
@Roles('ADMIN')
@Controller('admin')
export class AdminKontentController {
  constructor(private readonly kontent: KontentService) {}

  @Get('sections')
  tree() {
    return this.kontent.adminTree();
  }

  @Patch('sections/:id')
  updateSection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSectionDto) {
    return this.kontent.updateSection(id, dto);
  }

  @Get('lessons/:code')
  lesson(@Param('code') code: string) {
    return this.kontent.getLesson(code.toUpperCase());
  }

  @Patch('lessons/:code')
  updateLesson(@Param('code') code: string, @Body() dto: UpdateLessonDto) {
    return this.kontent.updateLesson(code.toUpperCase(), dto);
  }
}
