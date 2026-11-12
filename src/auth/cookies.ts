import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../common/auth-user';
import type { AppConfig } from '../config/app-config.service';
import type { IssuedTokens } from './token.service';

function base(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.get('COOKIE_SECURE'),
    domain: config.get('COOKIE_DOMAIN') || undefined,
    path: '/',
  };
}

export function setAuthCookies(res: Response, config: AppConfig, t: IssuedTokens) {
  res.cookie(ACCESS_COOKIE, t.accessToken, { ...base(config), expires: t.accessExpiresAt });
  if (t.refreshToken) {
    res.cookie(REFRESH_COOKIE, t.refreshToken, { ...base(config), expires: t.refreshExpiresAt });
  }
}

export function clearAuthCookies(res: Response, config: AppConfig) {
  res.clearCookie(ACCESS_COOKIE, base(config));
  res.clearCookie(REFRESH_COOKIE, base(config));
}
