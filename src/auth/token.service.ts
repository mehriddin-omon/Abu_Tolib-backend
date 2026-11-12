import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { AppConfig } from '../config/app-config.service';
import { randomToken, safeEqualHex, sha256 } from '../common/crypto';
import { Database, InjectDb } from '../database/database.module';
import { sessions, User, users } from '../database/schema';

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  accessExpiresAt: Date;
  /** null — refresh token o'zgarmadi (parallel so'rov, grace oynasi) */
  refreshToken: string | null;
  refreshExpiresAt: Date;
  user: User;
}

/** Ikki parallel refresh so'rovi uchun ruxsat etilgan oyna */
const ROTATION_GRACE_MS = 30_000;

/**
 * Access token — qisqa muddatli JWT (15 daqiqa).
 * Refresh token — "<sessionId>.<secret>" ko'rinishidagi opaque satr; bazada faqat secret xeshi.
 * Har refresh'da secret almashtiriladi (rotation). Eski secret grace oynasidan keyin
 * qayta kelsa — token o'g'irlangan deb hisoblanadi va sessiya bekor qilinadi.
 */
@Injectable()
export class TokenService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  private refreshTtlMs() {
    return this.config.get('REFRESH_TTL_DAYS') * 24 * 60 * 60 * 1000;
  }

  private async signAccess(user: User) {
    const ttlMin = this.config.get('JWT_ACCESS_TTL_MIN');
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: `${ttlMin}m` },
    );
    return { accessToken, accessExpiresAt: new Date(Date.now() + ttlMin * 60_000) };
  }

  async issue(user: User, meta: SessionMeta = {}): Promise<IssuedTokens> {
    const secret = randomToken(32);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtlMs());
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        refreshHash: sha256(secret),
        userAgent: meta.userAgent?.slice(0, 300),
        ip: meta.ip,
        expiresAt: refreshExpiresAt,
      })
      .returning({ id: sessions.id });
    return {
      ...(await this.signAccess(user)),
      refreshToken: `${session.id}.${secret}`,
      refreshExpiresAt,
      user,
    };
  }

  async rotate(refreshToken: string | undefined): Promise<IssuedTokens> {
    const parsed = parseRefresh(refreshToken);
    if (!parsed) throw new UnauthorizedException('Sessiya topilmadi');

    const session = await this.db.query.sessions.findFirst({
      where: and(eq(sessions.id, parsed.sessionId), isNull(sessions.revokedAt)),
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessiya muddati tugagan');
    }

    const user = await this.db.query.users.findFirst({ where: eq(users.id, session.userId) });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    const presented = sha256(parsed.secret);

    if (!safeEqualHex(presented, session.refreshHash)) {
      const inGrace =
        session.previousHash &&
        session.rotatedAt &&
        Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS &&
        safeEqualHex(presented, session.previousHash);
      if (inGrace) {
        // Parallel so'rov: yangi access beramiz, refresh'ni o'zgartirmaymiz
        return {
          ...(await this.signAccess(user)),
          refreshToken: null,
          refreshExpiresAt: session.expiresAt,
          user,
        };
      }
      await this.revokeById(session.id);
      throw new UnauthorizedException('Sessiya bekor qilindi, qaytadan kiring');
    }

    const secret = randomToken(32);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtlMs());
    await this.db
      .update(sessions)
      .set({
        previousHash: session.refreshHash,
        refreshHash: sha256(secret),
        rotatedAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: refreshExpiresAt,
      })
      .where(eq(sessions.id, session.id));

    return {
      ...(await this.signAccess(user)),
      refreshToken: `${session.id}.${secret}`,
      refreshExpiresAt,
      user,
    };
  }

  async revoke(refreshToken: string | undefined): Promise<void> {
    const parsed = parseRefresh(refreshToken);
    if (parsed) await this.revokeById(parsed.sessionId);
  }

  private async revokeById(id: string) {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, id), isNull(sessions.revokedAt)));
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRefresh(token: string | undefined) {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const sessionId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!UUID_RE.test(sessionId) || secret.length < 20) return null;
  return { sessionId, secret };
}
