import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, like } from 'drizzle-orm';
import { Database, InjectDb } from '../database/database.module';
import {
  attempts,
  lessons,
  questionOptions,
  questions,
  sections,
  testQuestions,
  tests,
} from '../database/schema';
import { CreateTestDto, UpdateTestDto } from './dto/test.dto';

@Injectable()
export class TestlarService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list() {
    const [rows, qCounts, aCounts] = await Promise.all([
      this.db.query.tests.findMany({
        orderBy: [asc(tests.kind), desc(tests.createdAt)],
        with: { section: { columns: { id: true, code: true, title: true } } },
      }),
      this.db
        .select({ id: testQuestions.testId, n: count() })
        .from(testQuestions)
        .groupBy(testQuestions.testId),
      this.db.select({ id: attempts.testId, n: count() }).from(attempts).groupBy(attempts.testId),
    ]);
    const qc = new Map(qCounts.map((r) => [r.id, r.n]));
    const ac = new Map(aCounts.map((r) => [r.id, r.n]));
    return rows.map((t) => ({
      ...t,
      questionCount: qc.get(t.id) ?? 0,
      attemptCount: ac.get(t.id) ?? 0,
    }));
  }

  async get(id: string) {
    const t = await this.db.query.tests.findFirst({
      where: eq(tests.id, id),
      with: {
        section: { columns: { id: true, code: true, title: true } },
        questions: {
          orderBy: asc(testQuestions.order),
          with: {
            question: { with: { options: { orderBy: asc(questionOptions.label) } } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Test topilmadi');
    const { questions: tq, ...rest } = t;
    return { ...rest, questions: tq.map((x) => x.question) };
  }

  private async assertSection(sectionId?: string | null) {
    if (!sectionId) return;
    const s = await this.db.query.sections.findFirst({ where: eq(sections.id, sectionId) });
    if (!s) throw new BadRequestException("Bo'lim topilmadi");
  }

  async create(dto: CreateTestDto) {
    if (dto.kind === 'SECTION_FINAL' && !dto.sectionId)
      throw new BadRequestException("Bo'lim nazorati uchun bo'lim tanlansin");
    await this.assertSection(dto.sectionId);
    const [t] = await this.db.insert(tests).values(dto).returning();
    return this.get(t.id);
  }

  async update(id: string, dto: UpdateTestDto) {
    const current = await this.get(id);
    await this.assertSection(dto.sectionId);
    const sectionId = dto.sectionId === undefined ? current.sectionId : dto.sectionId;
    if (current.kind === 'SECTION_FINAL' && !sectionId)
      throw new BadRequestException("Bo'lim nazorati bo'limsiz bo'lmaydi");
    if (dto.published && current.questions.length === 0)
      throw new BadRequestException("Savolsiz testni e'lon qilib bo'lmaydi");
    await this.db.update(tests).set(dto).where(eq(tests.id, id));
    return this.get(id);
  }

  async setQuestions(id: string, questionIds: string[]) {
    const test = await this.get(id);
    const unique = [...new Set(questionIds)];
    if (unique.length !== questionIds.length)
      throw new BadRequestException("Bir savol testda ikki marta bo'lmaydi");
    if (test.published && unique.length === 0)
      throw new BadRequestException("E'lon qilingan testni bo'shatib bo'lmaydi");
    if (unique.length) {
      const found = await this.db
        .select({ id: questions.id })
        .from(questions)
        .where(inArray(questions.id, unique));
      if (found.length !== unique.length) throw new BadRequestException("Ba'zi savollar topilmadi");
    }
    await this.db.transaction(async (tx) => {
      await tx.delete(testQuestions).where(eq(testQuestions.testId, id));
      if (unique.length)
        await tx
          .insert(testQuestions)
          .values(
            unique.map((questionId, order) => ({ testId: id, questionId, order: order + 1 })),
          );
    });
    return this.get(id);
  }

  /**
   * Bankdan avtomatik yig'ish — savollar bo'limlar va darslar bo'ylab teng taqsimlanadi.
   * DIAGNOSTIC: barcha bo'limlar (yakuniy nazorat darslarisiz), har darsdan ko'pi bilan bitta.
   * SECTION_FINAL / bo'limli PRACTICE: shu bo'limning darslari.
   */
  async autoAssemble(id: string, wanted: number) {
    const test = await this.get(id);
    const where =
      test.sectionId && test.section
        ? like(questions.lessonCode, `${test.section.code}-%`)
        : and(eq(lessons.isFinal, false));
    const pool = await this.db
      .select({ id: questions.id, lessonCode: questions.lessonCode, sectionId: lessons.sectionId })
      .from(questions)
      .innerJoin(lessons, eq(lessons.code, questions.lessonCode))
      .where(where);
    if (pool.length === 0) throw new BadRequestException("Bankda mos savol yo'q");

    const picked = spreadPick(pool, wanted, !test.sectionId);
    return this.setQuestions(id, picked);
  }

  async remove(id: string) {
    await this.get(id);
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(attempts)
      .where(eq(attempts.testId, id));
    if (n > 0)
      throw new ConflictException(`Testni ${n} marta ishlashgan — o'chirish o'rniga yashiring`);
    await this.db.delete(tests).where(eq(tests.id, id));
  }
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Bo'limlar → darslar → savollar bo'ylab navbatma-navbat tanlaydi:
 * avval har bo'limdan bittadan, keyin yana aylanib. Natijada savollar bir joyga yig'ilib qolmaydi.
 * `onePerLesson` — har darsdan faqat bitta (diagnostika uchun kengroq qamrov).
 */
export function spreadPick(
  pool: { id: string; lessonCode: string; sectionId: string }[],
  wanted: number,
  onePerLesson: boolean,
): string[] {
  const bySection = new Map<string, Map<string, string[]>>();
  for (const q of shuffle(pool)) {
    const lessonsMap = bySection.get(q.sectionId) ?? new Map<string, string[]>();
    lessonsMap.set(q.lessonCode, [...(lessonsMap.get(q.lessonCode) ?? []), q.id]);
    bySection.set(q.sectionId, lessonsMap);
  }
  // Har bo'lim uchun: darslar aralashtirilgan navbat, darsdan navbatma-navbat savol
  const sectionQueues = shuffle([...bySection.values()]).map((lm) => {
    const lessonQs = shuffle([...lm.values()]).map((qs) => (onePerLesson ? qs.slice(0, 1) : qs));
    const out: string[] = [];
    for (let round = 0; lessonQs.some((qs) => qs.length > round); round++)
      for (const qs of lessonQs) if (qs[round]) out.push(qs[round]);
    return out;
  });

  const result: string[] = [];
  for (let round = 0; result.length < wanted; round++) {
    let any = false;
    for (const q of sectionQueues) {
      if (q[round] && result.length < wanted) {
        result.push(q[round]);
        any = true;
      }
    }
    if (!any) break;
  }
  return result;
}
