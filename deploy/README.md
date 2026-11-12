# Production: DigitalOcean'ga joylash

Sxema: bitta Droplet, ichida Docker Compose orqali 4 ta konteyner:

```
Internet ──► Caddy (80/443, avtomatik HTTPS)
               ├── /api/*  ──► api  (NestJS, ghcr.io/mehriddin-omon/abu-tolib-api)
               └── /*      ──► web  (Next.js, ghcr.io/mehriddin-omon/abu-tolib-web)
                               api ──► postgres (faqat ichki tarmoqda)
```

`main` ga push qilinsa: GitHub Actions test qiladi → Docker image yig'adi → GHCR'ga yuklaydi →
Droplet'ga SSH orqali kirib yangi image'ni ishga tushiradi.

---

## Bir martalik sozlash (taxminan 30 daqiqa)

### 1. Telegram bot

1. Telegram'da [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Nomi: `Abu Tolib`, username: masalan `abu_tolib_bot` (`_bot` bilan tugashi shart).
3. BotFather bergan **token**ni saqlang — u `TELEGRAM_BOT_TOKEN` bo'ladi.
4. Ixtiyoriy: `/setdescription`, `/setuserpic` bilan tavsif va rasm qo'ying.

> Bitta token bilan faqat bitta joyda bot ishlay oladi. Lokal sinov uchun alohida
> test bot oching (`abu_tolib_dev_bot`), production tokenini lokalda ishlatmang.

### 2. Droplet

1. DigitalOcean → **Create → Droplets**.
2. Region: **Frankfurt (FRA1)** yoki **Amsterdam** — O'zbekistonga eng yaqinlari.
3. Image: **Ubuntu 24.04 LTS**.
4. Hajm: boshlash uchun **Basic, 2 GB RAM / 1 vCPU** yetadi.
5. Authentication: o'z SSH kalitingizni qo'shing.
6. Yaratilgach, **IP manzil**ni yozib oling.

### 3. Domen

Domen provayderingizda (masalan, `abutolib.uz`) ikkita **A** yozuv qo'shing:

| Turi | Nomi | Qiymati |
|---|---|---|
| A | `@` | Droplet IP |
| A | `www` | Droplet IP |

DNS tarqalishi 5 daqiqadan bir necha soatgacha olishi mumkin. Tekshirish: `ping abutolib.uz`.

### 4. Deploy uchun SSH kalit

O'z kompyuteringizda (GitHub Actions serverga shu kalit bilan kiradi):

```bash
ssh-keygen -t ed25519 -C "github-actions-abu-tolib" -f ~/.ssh/abu_tolib_deploy -N ""
cat ~/.ssh/abu_tolib_deploy.pub   # ← 5-qadamda kerak
cat ~/.ssh/abu_tolib_deploy       # ← 7-qadamda GitHub Secrets'ga
```

### 5. Serverni tayyorlash

```bash
scp deploy/setup-droplet.sh root@<IP>:/root/
ssh root@<IP> 'bash /root/setup-droplet.sh "<abu_tolib_deploy.pub ichidagi matn>"'
```

Skript: Docker, `deploy` foydalanuvchisi, firewall (faqat 22/80/443), 2 GB swap,
avtomatik xavfsizlik yangilanishlari va har kecha 03:30 da baza zaxirasini o'rnatadi.

### 6. Serverdagi `.env`

```bash
ssh deploy@<IP>
cd /opt/abu-tolib
nano .env          # deploy/.env.production.example dan nusxa olib to'ldiring
chmod 600 .env
```

Parollarni yaratish: `openssl rand -base64 32 | tr -d '/+='`.
`ADMIN_PHONES` ga o'z raqamingizni yozing (masalan `998901234567`) — shu raqam bilan
kirganingizda admin bo'lasiz.

### 7. GitHub sozlamalari (ikkala repozitoriyada)

**Settings → Secrets and variables → Actions:**

| Tur | Nomi | Qiymati |
|---|---|---|
| Secret | `DEPLOY_HOST` | Droplet IP |
| Secret | `DEPLOY_USER` | `deploy` |
| Secret | `DEPLOY_SSH_KEY` | `~/.ssh/abu_tolib_deploy` faylining **to'liq** matni |
| Variable | `DEPLOY_ENABLED` | `true` |

**Settings → Environments** → `production` muhitini yarating (ixtiyoriy: deploy'dan oldin
tasdiq so'rashni yoqish mumkin).

### 8. Birinchi deploy

1. **Avval frontend**: `Abu-Tolib_frontend` da `main` ga push → `abu-tolib-web` image paydo bo'ladi.
2. **Keyin backend**: `Abu_Tolib-backend` da `main` ga push → compose fayl serverga ko'chadi va
   hamma konteynerlar ishga tushadi.
3. GitHub → profilingiz → **Packages** → `abu-tolib-api` va `abu-tolib-web` → **Package settings**
   → **Change visibility → Public** (yoki repozitoriyaga ulang). Aks holda server image'ni
   tortib ololmasligi mumkin.

Tekshirish:

```bash
curl https://abutolib.uz/api/v1/health      # {"status":"ok","db":"ok",...}
```

Keyin saytga kiring → «Telegram orqali kirish» → botda Start → raqam yuborish → admin panel.

---

## Kundalik ishlar

```bash
ssh deploy@<IP> && cd /opt/abu-tolib

docker compose ps                      # holat
docker compose logs -f api             # backend loglari
docker compose logs -f caddy           # HTTPS / so'rovlar
docker compose restart api             # qayta ishga tushirish
docker compose exec postgres psql -U abutolib abu_tolib    # baza konsoli
ls backups/                            # kunlik zaxiralar
```

**Oldingi versiyaga qaytish:** har image commit SHA bilan ham saqlanadi:

```bash
API_TAG=<eski-commit-sha> docker compose up -d api
```

**Zaxiradan tiklash:**

```bash
gunzip -c backups/db-2026-11-20.sql.gz | docker compose exec -T postgres psql -U abutolib abu_tolib
```

Ixtiyoriy, lekin tavsiya etiladi: DigitalOcean'da Droplet uchun **Backups** (haftalik to'liq nusxa)
ni yoqing va zaxiralarni vaqti-vaqti bilan boshqa joyga (masalan, DO Spaces) ko'chiring.
