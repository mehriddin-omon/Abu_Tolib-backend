import { Module } from '@nestjs/common';
import { VariantService } from './variant.service';
import { VariantController } from './variant.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity } from '@my/core';
import { VariantEntity } from 'src/core/entity/variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VariantEntity, QuestionEntity])],
  controllers: [VariantController],
  providers: [VariantService],
  exports: [VariantService],
})
export class VariantModule {}
