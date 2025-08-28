import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DetailResultsService } from './detail-results.service';
import { CreateDetailResultDto } from './dto/create-detail-result.dto';
import { UpdateDetailResultDto } from './dto/update-detail-result.dto';

@Controller('detail-results')
export class DetailResultsController {
  constructor(private readonly detailResultsService: DetailResultsService) {}

  @Post()
  create(@Body() createDetailResultDto: CreateDetailResultDto) {
    return this.detailResultsService.create(createDetailResultDto);
  }

  @Get()
  findAll() {
    return this.detailResultsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.detailResultsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDetailResultDto: UpdateDetailResultDto) {
    return this.detailResultsService.update(+id, updateDetailResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detailResultsService.remove(+id);
  }
}
