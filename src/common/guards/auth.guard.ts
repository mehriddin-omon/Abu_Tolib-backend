import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE, AuthUser } from '../auth-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global guard: access token'ni `at` cookie'dan yoki `Authorization: Bearer` sarlavhasidan oladi.
 * Bearer — keyinchalik mobil ilova uchun.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException('Kirish talab qilinadi');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: AuthUser['role'] }>(token);
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan');
    }
  }
}

function extractToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  const fromCookie = cookies?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}
