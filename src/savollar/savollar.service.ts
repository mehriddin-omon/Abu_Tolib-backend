import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, like, SQL } from 'drizzle-orm';
import { Database, InjectDb } from '../database/database.module';
import { questionOptions, questions, testQuestions } from '../database/schema';
import { KontentService } from '../kontent/kontent.service';
import { parseCsv } from './csv';
import { CreateQuestionDto, ListQuestionsQuery, OptionDto } from './dto/question.dto';

export interface ImportRowError {
  row: number;
  errors: string[];
}

export interface ImportResult {
  total: number;
  valid: number;
  created: number;
  errors: ImportRowError[];
  /** Qaysi dars kodiga nechta savol tushadi */
  byLesson: Record<string, number>;
}

/** CSV sarlavhalari (katta-kichik harf farqi yo'q) → maydon */
const HEADER_ALIASES: Record<string, string> = {
  kod: 'code',
  dars: 'code',
  lesson_code: 'code',
  tur: 'type',
  type: 'type',
  qiyinlik: 'difficulty',
  difficulty: 'difficulty',
  savol: 'text',
  matn: 'text',
  text: 'text',
  javob: 'answer',
  answer: 'answer',
  izoh: 'explanation',
  yechim: 'explanation',
  explanation: 'explanation',
  manba: 'source',
  source: 'source',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
};

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

@Injectable()
export class SavollarService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly kontent: KontentService,
  ) {}

  /** Yaratish/tahrir/import uchun umumiy tekshiruv. Bo'sh massiv — hammasi joyida. */
  validate(dto: CreateQuestionDto, codes: Set<string>): string[] {
    const errs: string[] = [];
    if (!codes.has(dto.lessonCode)) errs.push(`"${dto.lessonCode}" dars kodi mavjud emas`);
    if (dto.type === 'SINGLE_CHOICE') {
      const opts = dto.options ?? [];
      if (opts.length < 2) errs.push('Kamida 2 ta variant kerak');
      if (opts.filter((o) => o.isCorrect).length !== 1)
        errs.push("Aynan bitta to'g'ri variant belgilansin");
      const labels = opts.map((o) => o.label);
      if (new Set(labels).size !== labels.length) errs.push('Variant harflari takrorlangan');
    } else {
      if (!dto.answerText?.trim()) errs.push("Son javobli savolga to'g'ri javob yozilsin");
      if (dto.answerText && Number.isNaN(Number(dto.answerText.replace(',', '.'))))
        errs.push("Javob son bo'lishi kerak (masalan 2.5 yoki -3)");
    }
    return errs;
  }

  private async assertValid(dto: CreateQuestionDto) {
    const errs = this.validate(dto, await this.kontent.codeSet());
    if (errs.length) throw new BadRequestException(errs);
  }

  private normalize(dto: CreateQuestionDto) {
    return {
      lessonCode: dto.lessonCode,
      type: dto.type,
      textMd: dto.textMd.trim(),
      difficulty: dto.difficulty,
      answerText:
        dto.type === 'NUMERIC' ? (dto.answerText?.trim().replace(',', '.') ?? null) : null,
      explanationMd: dto.explanationMd?.trim() || null,
      source: dto.source?.trim() || null,
    };
  }

  private optionRows(questionId: string, opts: OptionDto[] = []) {
    return opts.map((o) => ({
      questionId,
      label: o.label,
      textMd: o.textMd.trim(),
      isCorrect: o.isCorrect,
    }));
  }

  async list(q: ListQuestionsQuery) {
    const page = q.page ?? 1;
    const size = q.size ?? 20;
    const filters: SQL[] = [];
    if (q.lessonCode) filters.push(eq(questions.lessonCode, q.lessonCode));
    else if (q.sectionCode) filters.push(like(questions.lessonCode, `${q.sectionCode}-%`));
    if (q.difficulty) filters.push(eq(questions.difficulty, q.difficulty));
    if (q.search) filters.push(ilike(questions.textMd, `%${q.search}%`));
    const where = filters.length ? and(...filters) : undefined;

    const [items, [{ total }]] = await Promise.all([
      this.db.query.questions.findMany({
        where,
        orderBy: [asc(questions.lessonCode), desc(questions.createdAt)],
        limit: size,
        offset: (page - 1) * size,
        with: { options: { orderBy: asc(questionOptions.label) } },
      }),
      this.db.select({ total: count() }).from(questions).where(where),
    ]);

    const used = items.length
      ? await this.db
          .select({ id: testQuestions.questionId, n: count() })
          .from(testQuestions)
          .where(
            inArray(
              testQuestions.questionId,
              items.map((i) => i.id),
            ),
          )
          .groupBy(testQuestions.questionId)
      : [];
    const usedMap = new Map(used.map((u) => [u.id, u.n]));
    return {
      items: items.map((i) => ({ ...i, usedInTests: usedMap.get(i.id) ?? 0 })),
      total,
      page,
    };
  }

  async get(id: string) {
    const q = await this.db.query.questions.findFirst({
      where: eq(questions.id, id),
      with: { options: { orderBy: asc(questionOptions.label) } },
    });
    if (!q) throw new NotFoundException('Savol topilmadi');
    return q;
  }

  async create(dto: CreateQuestionDto) {
    await this.assertValid(dto);
    const id = await this.db.transaction(async (tx) => {
      const [q] = await tx.insert(questions).values(this.normalize(dto)).returning();
      if (dto.type === 'SINGLE_CHOICE')
        await tx.insert(questionOptions).values(this.optionRows(q.id, dto.options));
      return q.id;
    });
    return this.get(id);
  }

  /** Variantlar to'liq almashtiriladi (eski javoblar chosen_option_id = null bo'lib qoladi) */
  async update(id: string, dto: CreateQuestionDto) {
    await this.get(id);
    await this.assertValid(dto);
    await this.db.transaction(async (tx) => {
      await tx.update(questions).set(this.normalize(dto)).where(eq(questions.id, id));
      await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
      if (dto.type === 'SINGLE_CHOICE')
        await tx.insert(questionOptions).values(this.optionRows(id, dto.options));
    });
    return this.get(id);
  }

  async remove(id: string) {
    await this.get(id);
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(testQuestions)
      .where(eq(testQuestions.questionId, id));
    if (n > 0)
      throw new ConflictException(`Savol ${n} ta testda ishlatilgan — avval testdan olib tashlang`);
    try {
      await this.db.delete(questions).where(eq(questions.id, id));
    } catch {
      throw new ConflictException("Bu savolga talabalar javob bergan — o'chirib bo'lmaydi");
    }
  }

  /**
   * CSV'dan ommaviy import. Bitta qatorda xato bo'lsa ham hech narsa yozilmaydi —
   * avval dryRun bilan tekshirib, keyin yuklash tavsiya qilinadi.
   */
  async import(csv: string, dryRun = false): Promise<ImportResult> {
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new BadRequestException("CSV bo'sh yoki faqat sarlavhadan iborat");

    const header = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
    for (const need of ['code', 'text', 'answer'])
      if (!header.includes(need))
        throw new BadRequestException(
          `CSV sarlavhasida "${{ code: 'kod', text: 'savol', answer: 'javob' }[need]}" ustuni yo'q`,
        );

    const codes = await this.kontent.codeSet();
    const errors: ImportRowError[] = [];
    const valid: CreateQuestionDto[] = [];
    const byLesson: Record<string, number> = {};

    rows.slice(1).forEach((cells, i) => {
      const rowNo = i + 2; // Excel'dagi qator raqami
      const get = (k: string) => {
        const idx = header.indexOf(k);
        return idx >= 0 ? (cells[idx] ?? '').trim() : '';
      };
      const { dto, errs } = this.rowToDto(get);
      errs.push(...this.validate(dto, codes));
      if (errs.length) errors.push({ row: rowNo, errors: errs });
      else {
        valid.push(dto);
        byLesson[dto.lessonCode] = (byLesson[dto.lessonCode] ?? 0) + 1;
      }
    });

    const result: ImportResult = {
      total: rows.length - 1,
      valid: valid.length,
      created: 0,
      errors,
      byLesson,
    };
    if (dryRun || errors.length) return result;

    await this.db.transaction(async (tx) => {
      for (const dto of valid) {
        const [q] = await tx.insert(questions).values(this.normalize(dto)).returning();
        if (dto.type === 'SINGLE_CHOICE')
          await tx.insert(questionOptions).values(this.optionRows(q.id, dto.options));
      }
    });
    result.created = valid.length;
    return result;
  }

  private rowToDto(get: (k: string) => string): { dto: CreateQuestionDto; errs: string[] } {
    const errs: string[] = [];
    const options = OPTION_LABELS.map((label) => ({ label, textMd: get(label) })).filter(
      (o) => o.textMd !== '',
    );
    const rawType = get('type').toLowerCase();
    const type: CreateQuestionDto['type'] =
      rawType === 'son' || rawType === 'numeric' || (!rawType && options.length === 0)
        ? 'NUMERIC'
        : 'SINGLE_CHOICE';

    const diffRaw = get('difficulty');
    const difficulty = diffRaw ? Number(diffRaw) : 2;
    if (![1, 2, 3].includes(difficulty)) errs.push("Qiyinlik 1, 2 yoki 3 bo'lsin");

    const text = get('text');
    if (text.length < 3) errs.push("Savol matni bo'sh");

    const answer = get('answer');
    const dto: CreateQuestionDto = {
      lessonCode: get('code').toUpperCase(),
      type,
      textMd: text,
      difficulty,
      explanationMd: get('explanation') || undefined,
      source: get('source') || undefined,
    };
    if (type === 'SINGLE_CHOICE') {
      const correct = answer.toUpperCase();
      if (!OPTION_LABELS.includes(correct)) errs.push("Javob ustunida variant harfi (A–F) bo'lsin");
      else if (!options.some((o) => o.label === correct))
        errs.push(`${correct} variant matni bo'sh`);
      dto.options = options.map((o) => ({ ...o, isCorrect: o.label === correct }));
    } else {
      dto.answerText = answer;
    }
    return { dto, errs };
  }

  /** Har dars kodi bo'yicha savollar soni va qiyinlik taqsimoti */
  async stats() {
    return this.db
      .select({ lessonCode: questions.lessonCode, difficulty: questions.difficulty, n: count() })
      .from(questions)
      .groupBy(questions.lessonCode, questions.difficulty);
  }
}
