import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { VariantService } from './variant.service';
import { VariantEntity } from '@my/core';
import { CreateVariantDto} from './dto';
import { IResponse } from '@my/infrastructure';

@Controller('variants')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  // GET /variants - Barcha variantlarni olish
  @Get()
  async findAll(): Promise<VariantEntity[]> {
    return this.variantService.findAll();
  }

  // GET /variants/stats - Statistika
  @Get('stats')
  async getStats() {
    return this.variantService.getStats();
  }

  // GET /variants/correct - To'g'ri javoblarni olish
  @Get('correct')
  async findCorrectVariants(): Promise<VariantEntity[]> {
    return this.variantService.findCorrectVariants();
  }

  // GET /variants/search?q=term - Qidirish
  // @Get('search')
  // async search(@Query('q') searchTerm: string): Promise<VariantEntity[]> {
  //   return this.variantService.search(searchTerm);
  // }

  // GET /variants/question/:questionId - Savol bo'yicha variantlar
  @Get('question/:questionId')
  async findByQuestionId(@Param('questionId') questionId: string): Promise<IResponse<VariantEntity[]>> {
    return this.variantService.findByQuestionId(questionId);
  }

  // GET /variants/question/:questionId/correct - Savol bo'yicha to'g'ri javoblar
  @Get('question/:questionId/correct')
  async findCorrectByQuestionId(@Param('questionId') questionId: string): Promise<VariantEntity[]> {
    return this.variantService.findCorrectByQuestionId(questionId);
  }

  // GET /variants/:id - ID bo'yicha variant
  @Get(':id')
   async findById(@Param('id') id: string): Promise<VariantEntity> {
    return this.variantService.findById(id);
  }

  // POST /variants - Yangi variant yaratish
  @Post(':questionId')
  async create(
    @Param("questionId") questionId: string,
    @Body() createVariantDto: CreateVariantDto): Promise<IResponse<VariantEntity>> {
    return this.variantService.createQuestion(questionId, createVariantDto);
  }

  // POST /variants/bulk - Bir nechta variant yaratish
  // @Post('bulk')
  // async createMany(@Body() createVariantsDto: CreateVariantDto[]): Promise<VariantEntity[]> {
  //   return this.variantService.createMany(createVariantsDto);
  // }

  // PUT /variants/:id - Variantni yangilash
  
  // @Put(':id')
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateVariantDto: UpdateVariantDto,
  // ): Promise<VariantEntity> {
  //   return this.variantService.update(id, updateVariantDto);
  // }

  // // DELETE /variants/:id - Variantni o'chirish
  // @Delete(':id')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async delete(@Param('id') id: string): Promise<void> {
  //   return this.variantService.delete(id);
  // }

  // // DELETE /variants/question/:questionId - Savol bo'yicha barcha variantlarni o'chirish
  // @Delete('question/:questionId')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async deleteByQuestionId(@Param('questionId') questionId: string): Promise<void> {
  //   return this.variantService.deleteByQuestionId(questionId);
  // }
}