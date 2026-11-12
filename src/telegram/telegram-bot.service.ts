import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Bot, Context, InlineKeyboard, Keyboard } from 'grammy';
import { LoginService } from '../auth/login.service';
import { AppConfig } from '../config/app-config.service';

const MSG = {
  welcome:
    "Assalomu alaykum! Bu — Abu Tolib platformasining rasmiy boti.\n\n" +
    "Saytga kirish uchun saytdagi «Telegram orqali kirish» tugmasini bosing — u sizni shu yerga olib keladi.",
  askContact:
    "Birinchi marta kiryapsiz. Ro'yxatdan o'tish uchun pastdagi tugma orqali telefon raqamingizni yuboring.",
  contactButton: '📱 Telefon raqamni yuborish',
  confirmed: '✅ Kirish tasdiqlandi. Saytga qayting — sahifa o\'zi ochiladi.',
  registered:
    "✅ Ro'yxatdan o'tdingiz. Endi saytdagi «Telegram orqali kirish» tugmasini qayta bosing.",
  expired: "⏳ Bu havolaning muddati tugagan. Saytda «Telegram orqali kirish» tugmasini qayta bosing.",
  invalid: "Havola noto'g'ri. Saytdan qaytadan urinib ko'ring.",
  notOwn: "Iltimos, boshqa odamning emas, o'zingizning raqamingizni tugma orqali yuboring.",
  error: "Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.",
};

/**
 * Telegram bot (grammY, long polling). API jarayoni ichida ishlaydi.
 * TELEGRAM_BOT_TOKEN berilmasa — bot o'chiq, qolgan API ishlayveradi.
 */
@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TelegramBotService.name);
  private bot?: Bot;

  constructor(
    private readonly config: AppConfig,
    private readonly login: LoginService,
  ) {}

  onApplicationBootstrap() {
    const token = this.config.get('TELEGRAM_BOT_TOKEN');
    if (!token || this.config.get('NODE_ENV') === 'test') {
      this.log.warn('TELEGRAM_BOT_TOKEN berilmagan — Telegram bot o\'chiq');
      return;
    }
    this.bot = new Bot(token);
    this.register(this.bot);
    this.bot.catch((err) => this.log.error(`Bot xatosi: ${String(err.error)}`));
    // start() bot to'xtaguncha resolve bo'lmaydi — kutmaymiz
    void this.bot
      .start({
        drop_pending_updates: true,
        onStart: (me) => this.log.log(`Telegram bot ishga tushdi: @${me.username}`),
      })
      .catch((err: unknown) => this.log.error(`Bot ishga tushmadi: ${String(err)}`));
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private webButton(): InlineKeyboard | undefined {
    const url = this.config.get('WEB_URL');
    // Telegram localhost havolalarini qabul qilmaydi
    if (!url.startsWith('https://')) return undefined;
    return new InlineKeyboard().url('Saytga qaytish', url);
  }

  private register(bot: Bot) {
    bot.command('start', async (ctx) => {
      const payload = ctx.match?.trim() ?? '';
      if (!payload.startsWith('login_') || !ctx.from) {
        await ctx.reply(MSG.welcome);
        return;
      }
      await this.safe(ctx, async () => {
        const result = await this.login.handleStart(payload.slice(6), ctx.chat.id, ctx.from!.id);
        switch (result) {
          case 'confirmed':
            await ctx.reply(MSG.confirmed, { reply_markup: this.webButton() });
            break;
          case 'need_contact':
            await ctx.reply(MSG.askContact, {
              reply_markup: new Keyboard().requestContact(MSG.contactButton).resized().oneTime(),
            });
            break;
          case 'expired':
            await ctx.reply(MSG.expired);
            break;
          default:
            await ctx.reply(MSG.invalid);
        }
      });
    });

    bot.on('message:contact', async (ctx) => {
      const c = ctx.message.contact;
      await this.safe(ctx, async () => {
        const result = await this.login.handleContact(
          ctx.chat.id,
          ctx.from.id,
          {
            userId: c.user_id,
            phone: c.phone_number,
            firstName: c.first_name,
            lastName: c.last_name,
          },
          ctx.from.username,
        );
        const removeKb = { remove_keyboard: true as const };
        if (result === 'not_own') await ctx.reply(MSG.notOwn);
        else if (result === 'confirmed') {
          await ctx.reply(MSG.confirmed, { reply_markup: removeKb });
          const btn = this.webButton();
          if (btn) await ctx.reply('👇', { reply_markup: btn });
        } else await ctx.reply(MSG.registered, { reply_markup: removeKb });
      });
    });
  }

  private async safe(ctx: Context, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.log.error(err);
      await ctx.reply(MSG.error).catch(() => undefined);
    }
  }
}
