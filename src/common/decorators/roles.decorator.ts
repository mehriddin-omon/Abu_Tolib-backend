import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../database/schema';

export const ROLES_KEY = 'roles';
/** Faqat ko'rsatilgan rollarga ruxsat: @Roles('ADMIN') */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
