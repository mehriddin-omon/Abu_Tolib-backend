import { Module } from '@nestjs/common';
import { TestlarController } from './testlar.controller';
import { TestlarService } from './testlar.service';

@Module({
  controllers: [TestlarController],
  providers: [TestlarService],
  exports: [TestlarService],
})
export class TestlarModule {}
