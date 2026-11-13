/* eslint-disable @typescript-eslint/no-unsafe-call -- supertest javob tanasi any */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/token.service';
import { DB, Database } from '../src/database/database.module';
import { users } from '../src/database/schema';
import { API_PREFIX, setupApp } from '../src/setup-app';

/** 2-qadam: kontent, savollar banki, testlar */
describe('Kontent va savollar (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let adminAuth: string;
  let studentAuth: string;
  const api = (p: string) => `/${API_PREFIX}${p}`;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    setupApp(app);
    await app.init();
    db = app.get(DB);
    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
    await db.execute(sql`truncate users, sessions, login_requests, tests, questions cascade`);
    await db.execute(sql`update lessons set body_md = null, published = false`);

    const tokens = app.get(TokenService);
    const [admin, student] = await db
      .insert(users)
      .values([
        { firstName: 'Admin', phone: '998900000001', role: 'ADMIN' },
        { firstName: 'Talaba', phone: '998900000002', role: 'STUDENT' },
      ])
      .returning();
    adminAuth = `Bearer ${(await tokens.issue(admin)).accessToken}`;
    studentAuth = `Bearer ${(await tokens.issue(student)).accessToken}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const choice = (code = 'TENG-04', correct = 'B') => ({
    lessonCode: code,
    type: 'SINGLE_CHOICE',
    textMd: "$x^2 - 5x + 6 = 0$ ildizlari yig'indisi?",
    difficulty: 1,
    options: ['A', 'B', 'C', 'D'].map((label, i) => ({
      label,
      textMd: String(i + 4),
      isCorrect: label === correct,
    })),
  });

  it("migratsiya 14 bo'lim × 12 dars va kodlarni yaratadi", async () => {
    const res = await http()
      .get(api('/admin/sections'))
      .set('Authorization', adminAuth)
      .expect(200);
    expect(res.body).toHaveLength(14);
    const teng = res.body.find((s: { code: string }) => s.code === 'TENG');
    expect(teng.lessons).toHaveLength(12);
    expect(teng.lessons[3]).toMatchObject({
      code: 'TENG-04',
      title: 'Kvadrat tenglama va diskriminant',
    });
    expect(teng.lessons[11]).toMatchObject({ code: 'TENG-12', isFinal: true });
  });

  it('talaba admin kontentiga kira olmaydi', async () => {
    await http().get(api('/admin/sections')).set('Authorization', studentAuth).expect(403);
    await http().get(api('/admin/questions')).set('Authorization', studentAuth).expect(403);
  });

  it("konspekt tahriri; talaba faqat e'lon qilinganini ko'radi", async () => {
    await http().get(api('/lessons/teng-04')).set('Authorization', studentAuth).expect(404);
    await http()
      .patch(api('/admin/lessons/TENG-04'))
      .set('Authorization', adminAuth)
      .send({ bodyMd: '## Diskriminant\n\n$$D = b^2 - 4ac$$', published: true })
      .expect(200);
    const res = await http()
      .get(api('/lessons/teng-04'))
      .set('Authorization', studentAuth)
      .expect(200);
    expect(res.body.bodyMd).toContain('4ac');
    expect(res.body.section.code).toBe('TENG');

    const tree = await http().get(api('/sections')).set('Authorization', studentAuth).expect(200);
    const teng = tree.body.find((s: { code: string }) => s.code === 'TENG');
    expect(teng.lessons.map((l: { code: string }) => l.code)).toEqual(['TENG-04']);
    // kod o'zgartirilmaydi
    await http()
      .patch(api('/admin/lessons/TENG-04'))
      .set('Authorization', adminAuth)
      .send({ code: 'X-01' })
      .expect(400);
  });

  it('savol: yaratish, tekshiruv, tahrir, filtr', async () => {
    const created = await http()
      .post(api('/admin/questions'))
      .set('Authorization', adminAuth)
      .send(choice())
      .expect(201);
    expect(created.body.options).toHaveLength(4);

    const bad = await http()
      .post(api('/admin/questions'))
      .set('Authorization', adminAuth)
      .send({
        ...choice('XYZ-01'),
        options: choice().options.map((o) => ({ ...o, isCorrect: true })),
      })
      .expect(400);
    expect(bad.body.message.join(' ')).toMatch(/mavjud emas/);
    expect(bad.body.message.join(' ')).toMatch(/bitta to'g'ri/);

    const upd = await http()
      .put(api(`/admin/questions/${created.body.id}`))
      .set('Authorization', adminAuth)
      .send({
        lessonCode: 'TENG-05',
        type: 'NUMERIC',
        textMd: '2+3=?',
        difficulty: 2,
        answerText: '5',
      })
      .expect(200);
    expect(upd.body).toMatchObject({ lessonCode: 'TENG-05', type: 'NUMERIC', answerText: '5' });
    expect(upd.body.options).toHaveLength(0);

    const list = await http()
      .get(api('/admin/questions?sectionCode=teng&difficulty=2'))
      .set('Authorization', adminAuth)
      .expect(200);
    expect(list.body.total).toBe(1);
  });

  it("CSV import: dryRun xatolarni qator raqami bilan ko'rsatadi, xatosiz bo'lsa yozadi", async () => {
    const header = 'kod;qiyinlik;savol;A;B;C;D;javob;izoh\n';
    const good =
      'SON-03;1;"EKUB(12; 18) = ?";2;3;6;9;C;\nTENG-04;2;"$x^2=9$, musbat ildiz";;;;;3;\n';
    const bad = 'ZZZ-01;5;savol;1;2;;;E;\n';

    const dry = await http()
      .post(api('/admin/questions/import'))
      .set('Authorization', adminAuth)
      .send({ csv: header + good + bad, dryRun: true })
      .expect(200);
    expect(dry.body).toMatchObject({ total: 3, valid: 2, created: 0 });
    expect(dry.body.errors[0].row).toBe(4);
    expect(dry.body.errors[0].errors.length).toBeGreaterThanOrEqual(3);

    // xato bo'lsa hech narsa yozilmaydi
    const fail = await http()
      .post(api('/admin/questions/import'))
      .set('Authorization', adminAuth)
      .send({ csv: header + good + bad });
    expect(fail.body.created).toBe(0);

    const ok = await http()
      .post(api('/admin/questions/import'))
      .set('Authorization', adminAuth)
      .send({ csv: header + good })
      .expect(200);
    expect(ok.body).toMatchObject({ created: 2, byLesson: { 'SON-03': 1, 'TENG-04': 1 } });

    const son = await http()
      .get(api('/admin/questions?lessonCode=SON-03'))
      .set('Authorization', adminAuth);
    expect(son.body.items[0].textMd).toBe('EKUB(12; 18) = ?');
    expect(son.body.items[0].options.find((o: { isCorrect: boolean }) => o.isCorrect).label).toBe(
      'C',
    );
  });

  it("test: yaratish, avto-yig'ish, tartib, e'lon, o'chirishdan himoya", async () => {
    await http()
      .post(api('/admin/tests'))
      .set('Authorization', adminAuth)
      .send({ kind: 'SECTION_FINAL', title: 'Tenglamalar nazorati' })
      .expect(400);

    const t = await http()
      .post(api('/admin/tests'))
      .set('Authorization', adminAuth)
      .send({ kind: 'DIAGNOSTIC', title: 'Kirish diagnostikasi', timeLimitMin: 60 })
      .expect(201);

    await http()
      .patch(api(`/admin/tests/${t.body.id}`))
      .set('Authorization', adminAuth)
      .send({ published: true })
      .expect(400);

    const auto = await http()
      .post(api(`/admin/tests/${t.body.id}/auto`))
      .set('Authorization', adminAuth)
      .send({ count: 30 })
      .expect(200);
    expect(auto.body.questions).toHaveLength(3); // bankda 3 ta savol, har biri boshqa darsda

    const ids = auto.body.questions.map((q: { id: string }) => q.id).reverse();
    const reordered = await http()
      .put(api(`/admin/tests/${t.body.id}/questions`))
      .set('Authorization', adminAuth)
      .send({ questionIds: ids })
      .expect(200);
    expect(reordered.body.questions.map((q: { id: string }) => q.id)).toEqual(ids);

    await http()
      .patch(api(`/admin/tests/${t.body.id}`))
      .set('Authorization', adminAuth)
      .send({ published: true })
      .expect(200);

    const list = await http().get(api('/admin/tests')).set('Authorization', adminAuth).expect(200);
    expect(list.body[0]).toMatchObject({ questionCount: 3, published: true });

    // testdagi savolni o'chirib bo'lmaydi
    await http()
      .delete(api(`/admin/questions/${ids[0]}`))
      .set('Authorization', adminAuth)
      .expect(409);

    await http()
      .delete(api(`/admin/tests/${t.body.id}`))
      .set('Authorization', adminAuth)
      .expect(204);
    await http()
      .delete(api(`/admin/questions/${ids[0]}`))
      .set('Authorization', adminAuth)
      .expect(204);
  });
});
