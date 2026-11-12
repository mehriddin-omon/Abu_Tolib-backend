import type { Role } from '../database/schema';

/** Access token ichidagi ma'lumot */
export interface AuthUser {
  id: string;
  role: Role;
}

export const ACCESS_COOKIE = 'at';
export const REFRESH_COOKIE = 'rt';
