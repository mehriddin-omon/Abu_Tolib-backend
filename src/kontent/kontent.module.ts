import { Module } from '@nestjs/common';
import { AdminKontentController, KontentController } from './kontent.controller';
import { KontentService } from './kontent.service';

@Module({
  controllers: [KontentController, AdminKontentController],
  providers: [KontentService],
  exports: [KontentService],
})
export class KontentModule {}
