import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { AppConfig } from '../config/app-config.service';
import { normalizePhone } from '../common/crypto';
import { Database, InjectDb } from '../database/database.module';
import { User, users } from '../database/schema';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface TelegramProfile {
  telegramId: number;
  phone: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

/** Tashqariga beriladigan foydalanuvchi ko'rinishi */
export type PublicUser = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'username' | 'phone' | 'role' | 'grade' | 'region' | 'targetScore'
> & { profileComplete: boolean };

@Injectable()
export class UsersService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  async findById(id: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async findByTelegramId(telegramId: number): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.telegramId, telegramId) });
  }

  isAdminPhone(phone: string | null | undefined): boolean {
    return !!phone && this.config.get('ADMIN_PHONES').includes(normalizePhone(phone));
  }

  /**
   * Telegram kontakti bo'yicha foydalanuvchini topadi yoki yaratadi.
   * Telefon raqam ADMIN_PHONES ro'yxatida bo'lsa — ADMIN roli beriladi.
   */
  async upsertFromTelegram(p: TelegramProfile): Promise<User> {
    const phone = normalizePhone(p.phone);
    const role = this.isAdminPhone(phone) ? 'ADMIN' : undefined;

    const existing =
      (await this.findByTelegramId(p.telegramId)) ??
      (await this.db.query.users.findFirst({ where: eq(users.phone, phone) }));

    if (existing) {
      const [updated] = await this.db
        .update(users)
        .set({
          telegramId: p.telegramId,
          phone,
          username: p.username ?? existing.username,
          ...(role ? { role } : {}),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(users)
      .values({
        telegramId: p.telegramId,
        phone,
        firstName: p.firstName,
        lastName: p.lastName,
        username: p.username,
        role: role ?? 'STUDENT',
      })
      .returning();
    return created;
  }

  /** Faqat lokal ishlab chiqish uchun (AUTH_DEV_LOGIN) */
  async upsertDevUser(phone: string, firstName: string, role: User['role']): Promise<User> {
    const normalized = normalizePhone(phone);
    const [user] = await this.db
      .insert(users)
      .values({ phone: normalized, firstName, role })
      .onConflictDoUpdate({ target: users.phone, set: { role } })
      .returning();
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const [updated] = await this.db.update(users).set(dto).where(eq(users.id, id)).returning();
    if (!updated) throw new NotFoundException('Foydalanuvchi topilmadi');
    return updated;
  }

  async list(q: ListUsersQuery): Promise<{ items: PublicUser[]; total: number; page: number }> {
    const page = q.page ?? 1;
    const size = q.size ?? 20;
    const filters: SQL[] = [eq(users.role, q.role ?? 'STUDENT')];
    if (q.search) {
      const term = `%${q.search}%`;
      filters.push(
        or(ilike(users.firstName, term), ilike(users.lastName, term), ilike(users.phone, term))!,
      );
    }
    const where = and(...filters);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(size)
        .offset((page - 1) * size),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    return { items: rows.map((u) => this.toPublic(u)), total, page };
  }

  toPublic(u: User): PublicUser {
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      phone: u.phone,
      role: u.role,
      grade: u.grade,
      region: u.region,
      targetScore: u.targetScore,
      profileComplete: u.role === 'ADMIN' || (u.grade != null && u.targetScore != null),
    };
  }
}
