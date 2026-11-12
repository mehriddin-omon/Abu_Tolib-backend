# Abu Tolib — backend (API)

Milliy sertifikat (matematika) diagnostika platformasining backend qismi.
Frontend: [Abu-Tolib_frontend](https://github.com/mehriddin-omon/Abu-Tolib_frontend).

**Texnologiyalar:** NestJS 11 · TypeScript · PostgreSQL 16 · Drizzle ORM · grammY (Telegram bot) · JWT

## Lokal ishga tushirish

```bash
cp .env.example .env          # JWT_ACCESS_SECRET ni almashtiring
docker compose up -d          # PostgreSQL (abu_tolib + abu_tolib_test bazalari)
npm install
npm run db:migrate            # jadvallarni yaratish
npm run start:dev             # http://localhost:4000/api/v1
```

Swagger hujjati: <http://localhost:4000/api/v1/docs> (`SWAGGER_ENABLED=true` bo'lsa).

Botsiz kirish (faqat lokal, `AUTH_DEV_LOGIN=true`):

```bash
curl -X POST localhost:4000/api/v1/auth/dev-login \
  -H 'content-type: application/json' -d '{"phone":"998901234567","role":"ADMIN"}'
```

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run start:dev` | Ishlab chiqish rejimi (avtomatik qayta yuklanadi) |
| `npm run db:generate` | `schema.ts` o'zgargandan keyin yangi SQL migratsiya yaratish |
| `npm run db:migrate` | Migratsiyalarni bazaga qo'llash |
| `npm run db:studio` | Bazani brauzerda ko'rish (Drizzle Studio) |
| `npm test` | Unit testlar |
| `npm run test:e2e` | E2E testlar (`abu_tolib_test` bazasida) |
| `npm run lint` / `npm run typecheck` | Kod sifati |

## Tuzilma

```
src/
├─ main.ts, setup-app.ts     # server, prefix /api/v1, cookie, CORS, Swagger
├─ app.module.ts             # global guard'lar: limit → auth → rol
├─ config/                   # muhit o'zgaruvchilari (zod bilan tekshiriladi)
├─ database/
│  ├─ schema.ts              # BARCHA jadvallar (arxitekturadagi 5-bo'lim)
│  ├─ database.module.ts     # Drizzle ulanishi, @InjectDb()
│  └─ migrate.ts
├─ common/                   # @Public, @Roles, @CurrentUser, guard'lar, crypto
├─ auth/                     # Telegram orqali kirish, JWT, refresh rotation
├─ telegram/                 # grammY bot
├─ users/                    # profil, o'quvchilar ro'yxati (admin)
└─ health/                   # /api/v1/health
drizzle/                     # SQL migratsiyalar (git'da saqlanadi)
deploy/                      # production: compose, Caddy, Droplet skripti
```

Yangi modul qo'shish: `src/<modul>/` papkasida `*.module.ts`, `*.controller.ts`, `*.service.ts`,
keyin `app.module.ts` ga import. Servisda bazaga murojaat: `constructor(@InjectDb() private db: Database)`.

## Kirish oqimi (Telegram)

1. Brauzer `POST /auth/telegram/start` → `requestId`, `pollSecret`, `deepLink` oladi.
2. Talaba `deepLink` orqali botga o'tadi (`/start login_<token>`).
   Birinchi marta bo'lsa, bot telefon raqamini so'raydi (faqat o'z raqami qabul qilinadi).
3. Brauzer har 2 soniyada `POST /auth/telegram/poll` so'raydi. Bot tasdiqlagach —
   `at` (access, 15 daq) va `rt` (refresh, 30 kun) httpOnly cookie'lari o'rnatiladi.
4. `POST /auth/refresh` — refresh token har safar almashtiriladi. Eski token qayta
   ishlatilsa (o'g'irlik belgisi) sessiya bekor qilinadi.

`ADMIN_PHONES` ro'yxatidagi raqam bilan kirgan foydalanuvchi avtomatik `ADMIN` bo'ladi.

## Production

Batafsil: [`deploy/README.md`](deploy/README.md).
