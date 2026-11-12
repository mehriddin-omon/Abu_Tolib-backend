import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { Public } from '../common/decorators/public.decorator';
import { Database, InjectDb } from '../database/database.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Docker healthcheck va deploy tekshiruvi uchun */
  @Public()
  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ok', db: 'ok', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }
}
