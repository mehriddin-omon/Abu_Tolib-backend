import { Module } from '@nestjs/common';
import { KontentModule } from '../kontent/kontent.module';
import { SavollarController } from './savollar.controller';
import { SavollarService } from './savollar.service';

@Module({
  imports: [KontentModule],
  controllers: [SavollarController],
  providers: [SavollarService],
  exports: [SavollarService],
})
export class SavollarModule {}
