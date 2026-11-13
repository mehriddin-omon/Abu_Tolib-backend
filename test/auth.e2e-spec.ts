import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LoginService } from '../src/auth/login.service';
import { DB, Database } from '../src/database/database.module';
import { API_PREFIX, setupApp } from '../src/setup-app';

/**
 * To'liq kirish oqimi: brauzer → bot → brauzer.
 * Bot o'rniga LoginService.handleStart/handleContact to'g'ridan-to'g'ri chaqiriladi —
 * aynan shu metodlarni haqiqiy bot ham chaqiradi.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let login: LoginService;
  const api = (p: string) => `/${API_PREFIX}${p}`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    setupApp(app);
    await app.init();
    db = app.get(DB);
    login = app.get(LoginService);
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
  });

  beforeEach(async () => {
    await db.execute(sql`truncate users, sessions, login_requests cascade`);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Brauzer: start → bot tasdiqlaydi → poll; cookie'larni qaytaradi */
  async function fullLogin(tgId: number, phone: string, firstName = 'Dilnoza') {
    const start = await request(app.getHttpServer()).post(api('/auth/telegram/start')).expect(200);
    const { requestId, pollSecret, deepLink } = start.body as {
      requestId: string;
      pollSecret: string;
      deepLink: string;
    };
    const token = deepLink.split('start=login_')[1];

    const first = await login.handleStart(token, tgId, tgId);
    if (first === 'need_contact') {
      const r = await login.handleContact(tgId, tgId, { userId: tgId, phone, firstName });
      expect(r).toBe('confirmed');
    } else {
      expect(first).toBe('confirmed');
    }

    const poll = await request(app.getHttpServer())
      .post(api('/auth/telegram/poll'))
      .send({ requestId, pollSecret })
      .expect(200);
    return { poll, cookies: poll.headers['set-cookie'] as unknown as string[] };
  }

  const cookieHeader = (cookies: string[]) => cookies.map((c) => c.split(';')[0]).join('; ');
  const pick = (cookies: string[], name: string) =>
    cookies.find((c) => c.startsWith(`${name}=`))!.split(';')[0];

  it('health — baza ishlayapti', async () => {
    const res = await request(app.getHttpServer()).get(api('/health')).expect(200);
    expect(res.body.db).toBe('ok');
  });

  it('start — deep link va pollSecret qaytaradi, poll kutish holatida', async () => {
    const res = await request(app.getHttpServer()).post(api('/auth/telegram/start')).expect(200);
    expect(res.body.deepLink).toMatch(/^https:\/\/t\.me\/abu_tolib_test_bot\?start=login_[\w-]{32}$/);
    const poll = await request(app.getHttpServer())
      .post(api('/auth/telegram/poll'))
      .send({ requestId: res.body.requestId, pollSecret: res.body.pollSecret })
      .expect(200);
    expect(poll.body).toEqual({ status: 'pending' });
  });

  it("noto'g'ri pollSecret bilan sessiya olib bo'lmaydi", async () => {
    const res = await request(app.getHttpServer()).post(api('/auth/telegram/start')).expect(200);
    await request(app.getHttpServer())
      .post(api('/auth/telegram/poll'))
      .send({ requestId: res.body.requestId, pollSecret: 'x'.repeat(43) })
      .expect(404);
  });

  it('yangi talaba: kontakt → tasdiq → cookie → /auth/me', async () => {
    const { poll, cookies } = await fullLogin(5001, '+998 90 111 22 33');
    expect(poll.body.status).toBe('confirmed');
    expect(poll.body.user).toMatchObject({
      firstName: 'Dilnoza',
      phone: '998901112233',
      role: 'STUDENT',
      profileComplete: false,
    });
    expect(cookies.some((c) => c.startsWith('at=') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('rt=') && /HttpOnly/i.test(c))).toBe(true);

    const me = await request(app.getHttpServer())
      .get(api('/auth/me'))
      .set('Cookie', cookieHeader(cookies))
      .expect(200);
    expect(me.body.phone).toBe('998901112233');
  });

  it('sessiyani faqat bir marta olish mumkin', async () => {
    const start = await request(app.getHttpServer()).post(api('/auth/telegram/start'));
    const token = (start.body.deepLink as string).split('start=login_')[1];
    await login.handleStart(token, 7, 7);
    await login.handleContact(7, 7, { userId: 7, phone: '998907777777', firstName: 'A' });
    const body = { requestId: start.body.requestId, pollSecret: start.body.pollSecret };
    const a = await request(app.getHttpServer()).post(api('/auth/telegram/poll')).send(body);
    const b = await request(app.getHttpServer()).post(api('/auth/telegram/poll')).send(body);
    expect(a.body.status).toBe('confirmed');
    expect(b.body.status).toBe('expired');
  });

  it("qaytgan talabadan raqam qayta so'ralmaydi", async () => {
    await fullLogin(6001, '998902223344');
    const start = await request(app.getHttpServer()).post(api('/auth/telegram/start'));
    const token = (start.body.deepLink as string).split('start=login_')[1];
    await expect(login.handleStart(token, 6001, 6001)).resolves.toBe('confirmed');
  });

  it('boshqa odamning kontakti qabul qilinmaydi', async () => {
    await expect(
      login.handleContact(1, 1, { userId: 2, phone: '998900000002', firstName: 'X' }),
    ).resolves.toBe('not_own');
  });

  it('ADMIN_PHONES dagi raqam admin bo\'ladi va o\'quvchilar ro\'yxatini ko\'radi', async () => {
    await fullLogin(5001, '998901112233'); // talaba
    const admin = await fullLogin(9001, '+998900000001', 'Mehriddin');
    expect(admin.poll.body.user.role).toBe('ADMIN');

    const list = await request(app.getHttpServer())
      .get(api('/users'))
      .set('Cookie', cookieHeader(admin.cookies))
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].phone).toBe('998901112233');
  });

  it("talaba admin endpoint'ga kira olmaydi", async () => {
    const { cookies } = await fullLogin(5001, '998901112233');
    await request(app.getHttpServer())
      .get(api('/users'))
      .set('Cookie', cookieHeader(cookies))
      .expect(403);
  });

  it('refresh — tokenni almashtiradi; eski token keyin qayta kelsa sessiya bekor qilinadi', async () => {
    const { cookies } = await fullLogin(5001, '998901112233');
    const rt1 = pick(cookies, 'rt');

    const r1 = await request(app.getHttpServer())
      .post(api('/auth/refresh'))
      .set('Cookie', rt1)
      .expect(200);
    const rt2 = pick(r1.headers['set-cookie'] as unknown as string[], 'rt');
    expect(rt2).not.toEqual(rt1);

    // Grace oynasidan keyin eski tokenni qayta ishlatish — o'g'irlik belgisi
    await db.execute(sql`update sessions set rotated_at = now() - interval '1 minute'`);
    await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', rt1).expect(401);
    // Natijada yangi token ham ishlamaydi
    await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', rt2).expect(401);
  });

  it('parallel refresh (grace oynasi) sessiyani o\'chirmaydi', async () => {
    const { cookies } = await fullLogin(5001, '998901112233');
    const rt1 = pick(cookies, 'rt');
    const r1 = await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', rt1);
    const rt2 = pick(r1.headers['set-cookie'] as unknown as string[], 'rt');
    await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', rt1).expect(200);
    await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', rt2).expect(200);
  });

  it('logout — sessiya bekor, refresh ishlamaydi', async () => {
    const { cookies } = await fullLogin(5001, '998901112233');
    const rt = pick(cookies, 'rt');
    await request(app.getHttpServer()).post(api('/auth/logout')).set('Cookie', rt).expect(204);
    await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', rt).expect(401);
  });

  it('profilni to\'ldirish: sinf va maqsad ball', async () => {
    const { cookies } = await fullLogin(5001, '998901112233');
    const res = await request(app.getHttpServer())
      .patch(api('/users/me'))
      .set('Cookie', cookieHeader(cookies))
      .send({ grade: 11, targetScore: 65, region: 'Navoiy' })
      .expect(200);
    expect(res.body.profileComplete).toBe(true);
    await request(app.getHttpServer())
      .patch(api('/users/me'))
      .set('Cookie', cookieHeader(cookies))
      .send({ role: 'ADMIN' })
      .expect(400);
  });

  it("bot «Saytga qaytish» havolasi: bir marta sessiya beradi, boshqa tokenlarni qabul qilmaydi", async () => {
    const { poll } = await fullLogin(5001, '998901112233');
    const link = await login.createReturnLink(poll.body.user.id);
    expect(link).toMatch(/^http:\/\/localhost:3000\/kirish\/telegram\?t=[\w-]{32}$/);
    const token = link.split('t=')[1];

    const res = await request(app.getHttpServer())
      .post(api('/auth/telegram/exchange'))
      .send({ token })
      .expect(200);
    expect(res.body.user.phone).toBe('998901112233');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('rt='))).toBe(true);

    // ikkinchi marta — yo'q
    await request(app.getHttpServer()).post(api('/auth/telegram/exchange')).send({ token }).expect(410);

    // saytdagi deep link tokeni bilan almashtirib bo'lmaydi
    const start = await request(app.getHttpServer()).post(api('/auth/telegram/start'));
    const deep = (start.body.deepLink as string).split('start=login_')[1];
    await login.handleStart(deep, 5001, 5001);
    await request(app.getHttpServer())
      .post(api('/auth/telegram/exchange'))
      .send({ token: deep })
      .expect(410);
    // va qaytish havolasi tokeni bot /start ga yaramaydi
    const link2 = await login.createReturnLink(poll.body.user.id);
    await expect(login.handleStart(link2.split('t=')[1], 1, 1)).resolves.toBe('invalid');
  });

  it("qaytgan talabaning username'i yangilanadi, saytda kiritgan ismi saqlanadi", async () => {
    await fullLogin(6002, '998903334455', 'Eski');
    const start = await request(app.getHttpServer()).post(api('/auth/telegram/start'));
    const token = (start.body.deepLink as string).split('start=login_')[1];
    await login.handleStart(token, 6002, 6002, { firstName: 'Yangi', username: 'yangi_user' });
    const u = await login.findRegistered(6002);
    expect(u).toMatchObject({ firstName: 'Eski', username: 'yangi_user' });
  });

  it('dev-login test/production muhitida yopiq', async () => {
    await request(app.getHttpServer())
      .post(api('/auth/dev-login'))
      .send({ phone: '998900000099', role: 'ADMIN' })
      .expect(404);
  });
});
