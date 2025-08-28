import { Module } from '@nestjs/common';
import { DetailResultsService } from './detail-results.service';
import { DetailResultsController } from './detail-results.controller';

@Module({
  controllers: [DetailResultsController],
  providers: [DetailResultsService],
})
export class DetailResultsModule {}
