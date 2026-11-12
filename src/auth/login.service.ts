import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { AppConfig } from '../config/app-config.service';
import { randomToken, safeEqualHex, sha256 } from '../common/crypto';
import { Database, InjectDb } from '../database/database.module';
import { LoginRequest, loginRequests, User } from '../database/schema';
import { TelegramProfile, UsersService } from '../users/users.service';

export interface StartedLogin {
  requestId: string;
  /** Faqat brauzerda saqlanadi, poll uchun kerak */
  pollSecret: string;
  /** https://t.me/<bot>?start=login_<token> — bot sozlanmagan bo'lsa null */
  deepLink: string | null;
  expiresAt: Date;
}

export type PollResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'confirmed'; user: User };

export type BotStartResult = 'confirmed' | 'need_contact' | 'expired' | 'invalid';
export type BotContactResult = 'confirmed' | 'registered' | 'not_own';

/**
 * Telegram orqali kirish oqimi:
 *  1. Brauzer `start()` → requestId, pollSecret va deep link oladi.
 *  2. Talaba deep link orqali botga kiradi → bot `handleStart(token)` chaqiradi.
 *     Talaba avval ro'yxatdan o'tmagan bo'lsa, bot telefon raqamini so'raydi → `handleContact()`.
 *  3. So'rov CONFIRMED bo'ladi. Brauzer `poll()` orqali buni ko'radi va sessiya oladi.
 */
@Injectable()
export class LoginService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly users: UsersService,
    private readonly config: AppConfig,
  ) {}

  async start(): Promise<StartedLogin> {
    const token = randomToken(24); // 32 belgi — Telegram start parametri (≤64) ichiga sig'adi
    const pollSecret = randomToken(32);
    const expiresAt = new Date(Date.now() + this.config.get('LOGIN_REQUEST_TTL_MIN') * 60_000);

    const [row] = await this.db
      .insert(loginRequests)
      .values({ tokenHash: sha256(token), pollSecretHash: sha256(pollSecret), expiresAt })
      .returning({ id: loginRequests.id });

    const bot = this.config.get('TELEGRAM_BOT_USERNAME');
    return {
      requestId: row.id,
      pollSecret,
      deepLink: bot ? `https://t.me/${bot}?start=login_${token}` : null,
      expiresAt,
    };
  }

  async poll(requestId: string, pollSecret: string): Promise<PollResult> {
    const req = await this.db.query.loginRequests.findFirst({
      where: eq(loginRequests.id, requestId),
    });
    if (!req || !safeEqualHex(sha256(pollSecret), req.pollSecretHash)) {
      throw new NotFoundException('Kirish so\'rovi topilmadi');
    }

    if (req.status === 'CONFIRMED' && req.userId) {
      // Atomik: sessiyani faqat bitta poll oladi
      const [used] = await this.db
        .update(loginRequests)
        .set({ status: 'USED' })
        .where(and(eq(loginRequests.id, req.id), eq(loginRequests.status, 'CONFIRMED')))
        .returning({ userId: loginRequests.userId });
      if (!used?.userId) return { status: 'expired' };
      const user = await this.users.getById(used.userId);
      return { status: 'confirmed', user };
    }

    if (req.status === 'USED' || req.expiresAt < new Date()) return { status: 'expired' };
    return { status: 'pending' };
  }

  /** Bot: /start login_<token> */
  async handleStart(token: string, chatId: number, telegramUserId: number): Promise<BotStartResult> {
    const req = await this.db.query.loginRequests.findFirst({
      where: eq(loginRequests.tokenHash, sha256(token)),
    });
    if (!req) return 'invalid';
    if (!this.isOpen(req)) return 'expired';

    const user = await this.users.findByTelegramId(telegramUserId);
    if (user?.phone) {
      // Admin ro'yxati o'zgargan bo'lsa, rolni yangilaymiz
      const fresh = await this.users.upsertFromTelegram({
        telegramId: telegramUserId,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName ?? undefined,
        username: user.username ?? undefined,
      });
      await this.confirm(req.id, fresh.id, chatId);
      return 'confirmed';
    }

    await this.db
      .update(loginRequests)
      .set({ status: 'AWAITING_CONTACT', telegramChatId: chatId })
      .where(eq(loginRequests.id, req.id));
    return 'need_contact';
  }

  /** Bot: foydalanuvchi "Telefon raqamni yuborish" tugmasini bosdi */
  async handleContact(
    chatId: number,
    fromUserId: number,
    contact: { userId?: number; phone: string; firstName: string; lastName?: string },
    username?: string,
  ): Promise<BotContactResult> {
    // Faqat o'zining raqami qabul qilinadi (boshqa odamning kontaktini yuborib bo'lmaydi)
    if (contact.userId !== fromUserId) return 'not_own';

    const profile: TelegramProfile = {
      telegramId: fromUserId,
      phone: contact.phone,
      firstName: contact.firstName,
      lastName: contact.lastName,
      username,
    };
    const user = await this.users.upsertFromTelegram(profile);

    const pending = await this.db.query.loginRequests.findFirst({
      where: and(
        eq(loginRequests.telegramChatId, chatId),
        inArray(loginRequests.status, ['AWAITING_CONTACT', 'PENDING']),
        gt(loginRequests.expiresAt, new Date()),
      ),
      orderBy: desc(loginRequests.createdAt),
    });
    if (!pending) return 'registered';

    await this.confirm(pending.id, user.id, chatId);
    return 'confirmed';
  }

  private isOpen(req: LoginRequest) {
    return (
      (req.status === 'PENDING' || req.status === 'AWAITING_CONTACT') && req.expiresAt > new Date()
    );
  }

  private async confirm(requestId: string, userId: string, chatId: number) {
    await this.db
      .update(loginRequests)
      .set({ status: 'CONFIRMED', userId, telegramChatId: chatId, confirmedAt: new Date() })
      .where(eq(loginRequests.id, requestId));
  }
}
