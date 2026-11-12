import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [AuthModule],
  providers: [TelegramBotService],
})
export class TelegramModule {}
