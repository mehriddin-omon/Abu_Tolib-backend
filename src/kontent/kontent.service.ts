import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { Database, InjectDb } from '../database/database.module';
import { lessons, questions, sections } from '../database/schema';
import { UpdateLessonDto, UpdateSectionDto } from './dto/kontent.dto';

/** Dars kodining ko'rinishi: TENG-04 */
export const LESSON_CODE_RE = /^[A-Z]{2,6}-\d{2}$/;

@Injectable()
export class KontentService {
  constructor(@InjectDb() private readonly db: Database) {}

  /**
   * Admin uchun to'liq daraxt: har bo'lim va darsi + konspekt bormi, savollar soni.
   * Konspekt matni bu yerda qaytmaydi (og'ir) — faqat `hasBody`.
   */
  async adminTree() {
    const qCounts = await this.db
      .select({ code: questions.lessonCode, n: count() })
      .from(questions)
      .groupBy(questions.lessonCode);
    const byCode = new Map(qCounts.map((r) => [r.code, r.n]));

    const rows = await this.db.query.sections.findMany({
      orderBy: asc(sections.order),
      with: {
        lessons: {
          orderBy: asc(lessons.order),
          columns: { bodyMd: false },
          extras: {
            hasBody: sql<boolean>`coalesce(length(${lessons.bodyMd}), 0) > 0`.as('has_body'),
          },
        },
      },
    });
    return rows.map((s) => ({
      ...s,
      lessons: s.lessons.map((l) => ({ ...l, questionCount: byCode.get(l.code) ?? 0 })),
      questionCount: s.lessons.reduce((a, l) => a + (byCode.get(l.code) ?? 0), 0),
    }));
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    const [row] = await this.db.update(sections).set(dto).where(eq(sections.id, id)).returning();
    if (!row) throw new NotFoundException("Bo'lim topilmadi");
    return row;
  }

  async getLesson(code: string, onlyPublished = false) {
    const lesson = await this.db.query.lessons.findFirst({
      where: onlyPublished
        ? and(eq(lessons.code, code), eq(lessons.published, true))
        : eq(lessons.code, code),
      with: { section: { columns: { id: true, code: true, title: true, slug: true } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return lesson;
  }

  async updateLesson(code: string, dto: UpdateLessonDto) {
    const [row] = await this.db.update(lessons).set(dto).where(eq(lessons.code, code)).returning();
    if (!row) throw new NotFoundException('Dars topilmadi');
    return row;
  }

  /** Talaba uchun: faqat e'lon qilingan darslar, konspektsiz */
  async publicTree() {
    const rows = await this.db.query.sections.findMany({
      orderBy: asc(sections.order),
      columns: { id: true, code: true, slug: true, title: true, order: true },
      with: {
        lessons: {
          where: eq(lessons.published, true),
          orderBy: asc(lessons.order),
          columns: { id: true, code: true, title: true, order: true, isFinal: true },
        },
      },
    });
    return rows;
  }

  /** Mavjud dars kodlari (import va validatsiya uchun) */
  async codeSet(): Promise<Set<string>> {
    const rows = await this.db.select({ code: lessons.code }).from(lessons);
    return new Set(rows.map((r) => r.code));
  }
}
