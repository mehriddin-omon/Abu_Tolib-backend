import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Bot, Context, GrammyError, InlineKeyboard, Keyboard } from 'grammy';
import type { User as TgUser } from 'grammy/types';
import { LoginService, TelegramNames } from '../auth/login.service';
import { AppConfig } from '../config/app-config.service';

const MSG = {
  askContact: (name: string) =>
    `Assalomu alaykum, ${name}! 👋\n\n` +
    'Abu Tolib — milliy sertifikat (matematika) uchun diagnostika platformasi.\n\n' +
    "Ro'yxatdan o'tish uchun pastdagi «📱 Telefon raqamni yuborish» tugmasini bosing. " +
    'Raqamingiz faqat sizni tanish uchun ishlatiladi.',
  contactButton: '📱 Telefon raqamni yuborish',
  registered: (name: string) => `✅ Rahmat, ${name}! Ro'yxatdan o'tdingiz.`,
  confirmed: (name: string) => `✅ ${name}, kirish tasdiqlandi.`,
  welcomeBack: (name: string) => `Xush kelibsiz, ${name}! 👋`,
  goToSite: "Saytga o'tish uchun pastdagi tugmani bosing 👇",
  goToSiteBrowser:
    "Saytdagi sahifa o'zi ochiladi. Boshqa qurilmada kirmoqchi bo'lsangiz — havola (10 daqiqa amal qiladi):",
  siteButton: '🌐 Saytga qaytish',
  expired:
    '⏳ Bu havolaning muddati tugagan. Saytda «Telegram orqali kirish» tugmasini qayta bosing.',
  invalid: "Havola noto'g'ri. Saytdan qaytadan urinib ko'ring.",
  notOwn:
    "Iltimos, boshqa odamning emas, o'zingizning raqamingizni pastdagi tugma orqali yuboring.",
  error: "Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.",
  help:
    'Abu Tolib boti saytga kirish uchun ishlatiladi.\n\n' +
    "/start — ro'yxatdan o'tish yoki saytga kirish havolasini olish",
};

/**
 * Telegram bot (grammY, long polling). API jarayoni ichida ishlaydi.
 * TELEGRAM_BOT_TOKEN berilmasa — bot o'chiq, qolgan API ishlayveradi.
 *
 * Oqim:
 *  - Saytdan kelgan /start login_<token>: tanish foydalanuvchi bo'lsa darhol tasdiqlanadi,
 *    yangi bo'lsa telefon raqami so'raladi.
 *  - Oddiy /start: ro'yxatdan o'tkazadi yoki saytga kirish havolasini beradi.
 *  - Har ikki holatda oxirida "Saytga qaytish" tugmasi — u bir martalik havola bo'lib,
 *    qaysi brauzerda ochilsa o'sha yerda talabani tizimga kiritadi.
 */
@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TelegramBotService.name);
  private bot?: Bot;

  constructor(
    private readonly config: AppConfig,
    private readonly login: LoginService,
  ) {}

  async onApplicationBootstrap() {
    const token = this.config.get('TELEGRAM_BOT_TOKEN');
    if (!token || this.config.get('NODE_ENV') === 'test') {
      this.log.warn("TELEGRAM_BOT_TOKEN berilmagan — Telegram bot o'chiq");
      return;
    }
    const bot = new Bot(token);
    this.bot = bot;
    this.register(bot);
    bot.catch((err) => this.log.error(`Bot xatosi: ${String(err.error)}`));

    try {
      // Bot username'ini Telegram'dan olamiz — TELEGRAM_BOT_USERNAME majburiy emas
      await bot.init();
      this.login.setBotUsername(bot.botInfo.username);
      await bot.api
        .setMyCommands([{ command: 'start', description: "Ro'yxatdan o'tish / saytga kirish" }])
        .catch(() => undefined);
    } catch (err) {
      this.log.error(`Telegram'ga ulanib bo'lmadi (token to'g'rimi?): ${String(err)}`);
      return;
    }

    // start() bot to'xtaguncha resolve bo'lmaydi — kutmaymiz
    void bot
      .start({
        drop_pending_updates: true,
        allowed_updates: ['message'],
        onStart: (me) => this.log.log(`Telegram bot ishga tushdi: @${me.username}`),
      })
      .catch((err: unknown) => this.log.error(`Bot ishga tushmadi: ${String(err)}`));
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private register(bot: Bot) {
    bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      const from = ctx.from;
      const payload = ctx.match?.trim() ?? '';

      await this.safe(ctx, async () => {
        // Saytdagi «Telegram orqali kirish» tugmasidan kelgan
        if (payload.startsWith('login_')) {
          const result = await this.login.handleStart(
            payload.slice(6),
            ctx.chat.id,
            from.id,
            namesOf(from),
          );
          if (result === 'confirmed') {
            await ctx.reply(MSG.confirmed(from.first_name));
            await this.sendSiteLink(ctx, from.id, true);
          } else if (result === 'need_contact') await this.askContact(ctx, from);
          else if (result === 'expired') await ctx.reply(MSG.expired);
          else await ctx.reply(MSG.invalid);
          return;
        }

        // Botga to'g'ridan-to'g'ri kirgan
        const user = await this.login.findRegistered(from.id, namesOf(from));
        if (user) {
          await ctx.reply(MSG.welcomeBack(user.firstName));
          await this.sendSiteLink(ctx, from.id, false);
        } else await this.askContact(ctx, from);
      });
    });

    bot.command('help', (ctx) => ctx.reply(MSG.help));

    bot.on('message:contact', async (ctx) => {
      const c = ctx.message.contact;
      await this.safe(ctx, async () => {
        const result = await this.login.handleContact(
          ctx.chat.id,
          ctx.from.id,
          {
            userId: c.user_id,
            phone: c.phone_number,
            // Kontakt kartasidagi ism telefon kitobidan bo'lishi mumkin — Telegram profilini afzal ko'ramiz
            firstName: ctx.from.first_name || c.first_name,
            lastName: ctx.from.last_name ?? c.last_name,
          },
          ctx.from.username,
        );
        if (result === 'not_own') {
          await ctx.reply(MSG.notOwn);
          return;
        }
        const removeKb = { reply_markup: { remove_keyboard: true as const } };
        await ctx.reply(
          result === 'confirmed'
            ? MSG.confirmed(ctx.from.first_name)
            : MSG.registered(ctx.from.first_name),
          removeKb,
        );
        await this.sendSiteLink(ctx, ctx.from.id, result === 'confirmed');
      });
    });

    // Boshqa har qanday xabar — yo'riqnoma
    bot.on('message', async (ctx) => {
      const user = await this.login.findRegistered(ctx.from.id).catch(() => null);
      if (user) await this.sendSiteLink(ctx, ctx.from.id, false);
      else await this.askContact(ctx, ctx.from);
    });
  }

  private async askContact(ctx: Context, from: TgUser) {
    await ctx.reply(MSG.askContact(from.first_name), {
      reply_markup: new Keyboard().requestContact(MSG.contactButton).resized().oneTime(),
    });
  }

  /**
   * "Saytga qaytish" tugmasi (bir martalik havola).
   * Telegram http/localhost manzilli tugmani rad etadi — lokal ishlab chiqishda havola matn bo'lib boradi.
   * `fromBrowser` — saytdagi sahifa kutib turibdi (u o'zi ochiladi).
   */
  private async sendSiteLink(ctx: Context, telegramUserId: number, fromBrowser: boolean) {
    const user = await this.login.findRegistered(telegramUserId);
    if (!user) return;
    const link = await this.login.createReturnLink(user.id);
    try {
      await ctx.reply(MSG.goToSite, {
        reply_markup: new InlineKeyboard().url(MSG.siteButton, link),
      });
    } catch (err) {
      if (!(err instanceof GrammyError) || err.error_code !== 400) throw err;
      await ctx.reply(`${fromBrowser ? MSG.goToSiteBrowser : MSG.goToSite}\n${link}`, {
        link_preview_options: { is_disabled: true },
      });
    }
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

function namesOf(u: TgUser): TelegramNames {
  return { firstName: u.first_name, lastName: u.last_name, username: u.username };
}
