import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Endpoint'ni kirishsiz ochiq qiladi */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
