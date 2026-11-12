import { z } from 'zod';

/** Barcha muhit o'zgaruvchilari shu yerda tekshiriladi. Xato bo'lsa ilova ishga tushmaydi. */
const bool = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().url(),

  /** Frontend manzili — CORS va bot xabaridagi havola uchun */
  WEB_URL: z.string().url().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET kamida 32 belgi bo\'lsin'),
  JWT_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Production'da true (HTTPS). Lokal http uchun false. */
  COOKIE_SECURE: bool,
  /** Bo'sh qoldirilsa cookie joriy domenga beriladi */
  COOKIE_DOMAIN: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  /** Admin bo'ladigan telefon raqamlar, vergul bilan: 998901234567,998911112233 */
  ADMIN_PHONES: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((p) => p.replace(/\D/g, ''))
        .filter(Boolean),
    ),
  LOGIN_REQUEST_TTL_MIN: z.coerce.number().int().positive().default(10),

  /** Faqat lokal ishlab chiqish uchun: botsiz kirish. Production'da hech qachon ishlamaydi. */
  AUTH_DEV_LOGIN: bool,
  SWAGGER_ENABLED: bool,
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${issues.join('\n')}`);
  }
  return parsed.data;
}
