import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** URL va Telegram deep link uchun xavfsiz tasodifiy satr (base64url) */
export const randomToken = (bytes = 24): string => randomBytes(bytes).toString('base64url');

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Telefon raqamni faqat raqamlarga keltiradi: "+998 90 123-45-67" → "998901234567" */
export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');
