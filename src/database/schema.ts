/**
 * Abu Tolib — ma'lumotlar bazasi sxemasi (Drizzle ORM).
 *
 * Barcha bog'lanishlarning markazi — lessons.code (masalan "TENG-04"):
 * savol, mastery, yozma ish va tavsiyalar shu kod orqali bog'lanadi.
 *
 * O'zgartirgandan keyin: `npm run db:generate` — yangi SQL migratsiya yaratadi.
 */
import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ─────────────────────────── Foydalanuvchi va kirish ───────────────────────────

export const roleEnum = pgEnum('role', ['STUDENT', 'ADMIN']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').unique(),
  telegramId: bigint('telegram_id', { mode: 'number' }).unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  username: text('username'),
  role: roleEnum('role').notNull().default('STUDENT'),
  grade: integer('grade'),
  region: text('region'),
  targetScore: integer('target_score'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Refresh token sessiyasi. Token o'zi saqlanmaydi, faqat sha256 xeshi. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshHash: text('refresh_hash').notNull(),
    /** Oldingi xesh: bir vaqtda kelgan ikki refresh so'rovi sessiyani o'chirib yubormasligi uchun */
    previousHash: text('previous_hash'),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const loginStatusEnum = pgEnum('login_status', [
  'PENDING', // brauzer kutyapti
  'AWAITING_CONTACT', // bot telefon raqam so'radi
  'CONFIRMED', // bot tasdiqladi, brauzer sessiyani olishi mumkin
  'USED', // sessiya berildi
]);

/**
 * Telegram orqali kirish so'rovi.
 * token — deep link'da ko'rinadi (t.me/bot?start=login_<token>),
 * pollSecret — faqat brauzerda qoladi, sessiyani faqat u ola oladi.
 */
export const loginRequests = pgTable(
  'login_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    pollSecretHash: text('poll_secret_hash').notNull(),
    status: loginStatusEnum('status').notNull().default('PENDING'),
    telegramChatId: bigint('telegram_chat_id', { mode: 'number' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('login_requests_chat_idx').on(t.telegramChatId)],
);

// ─────────────────────────────────── Kontent ───────────────────────────────────

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    /** Diagnostika kodi, masalan "TENG-04". O'zgarmas bo'lishi kerak. */
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    order: integer('order').notNull(),
    bodyMd: text('body_md'),
    /** Bo'limning 12-darsi — yakuniy nazorat */
    isFinal: boolean('is_final').notNull().default(false),
    published: boolean('published').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique('lessons_section_order_uq').on(t.sectionId, t.order)],
);

export const questionTypeEnum = pgEnum('question_type', ['SINGLE_CHOICE', 'NUMERIC']);

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonCode: text('lesson_code')
      .notNull()
      .references(() => lessons.code, { onUpdate: 'cascade' }),
    type: questionTypeEnum('type').notNull().default('SINGLE_CHOICE'),
    textMd: text('text_md').notNull(),
    /** 1 — oddiy, 2 — o'rta, 3 — qiyin */
    difficulty: integer('difficulty').notNull().default(1),
    /** NUMERIC turidagi savol uchun to'g'ri javob */
    answerText: text('answer_text'),
    explanationMd: text('explanation_md'),
    imageKey: text('image_key'),
    source: text('source'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('questions_lesson_idx').on(t.lessonCode)],
);

export const questionOptions = pgTable('question_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  textMd: text('text_md').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
});

export const testKindEnum = pgEnum('test_kind', ['DIAGNOSTIC', 'SECTION_FINAL', 'PRACTICE']);

export const tests = pgTable('tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: testKindEnum('kind').notNull(),
  title: text('title').notNull(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'set null' }),
  timeLimitMin: integer('time_limit_min'),
  published: boolean('published').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const testQuestions = pgTable(
  'test_questions',
  {
    testId: uuid('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    order: integer('order').notNull(),
  },
  (t) => [primaryKey({ columns: [t.testId, t.questionId] })],
);

// ─────────────────────────────────── Natija ───────────────────────────────────

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    testId: uuid('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'restrict' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    score: integer('score'),
  },
  (t) => [index('attempts_user_idx').on(t.userId)],
);

export const errorReasonEnum = pgEnum('error_reason', [
  'FORMULA_FORGOT', // formulani eslamadim
  'CALC_ERROR', // hisoblashda xato
  'MISREAD_CONDITION', // shartni noto'g'ri tushundim
  'CONDITION_NOT_CHECKED', // shartni (OQS) tekshirmadim
  'DIDNT_KNOW', // mavzuni bilmayman
  'OTHER',
]);

export const answers = pgTable(
  'answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    chosenOptionId: uuid('chosen_option_id').references(() => questionOptions.id, {
      onDelete: 'set null',
    }),
    valueText: text('value_text'),
    isCorrect: boolean('is_correct').notNull().default(false),
    errorReason: errorReasonEnum('error_reason'),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('answers_attempt_question_uq').on(t.attemptId, t.questionId)],
);

/** Har bir talaba × dars kodi uchun o'zlashtirish balli (0–100). */
export const mastery = pgTable(
  'mastery',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonCode: text('lesson_code')
      .notNull()
      .references(() => lessons.code, { onUpdate: 'cascade' }),
    score: integer('score').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonCode] })],
);

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    practiceDone: integer('practice_done').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

// ───────────────────────────────── Yozma ish ─────────────────────────────────

export const writtenTasks = pgTable('written_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonCode: text('lesson_code')
    .notNull()
    .references(() => lessons.code, { onUpdate: 'cascade' }),
  statementMd: text('statement_md').notNull(),
  solutionMd: text('solution_md').notNull(),
  rubricMd: text('rubric_md').notNull(),
  timeLimitMin: integer('time_limit_min').notNull().default(30),
  maxScore: integer('max_score').notNull().default(10),
  published: boolean('published').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const submissionStatusEnum = pgEnum('submission_status', [
  'STARTED',
  'SUBMITTED',
  'AI_PENDING',
  'AI_DONE',
  'REVIEWED',
  'FAILED',
]);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => writtenTasks.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: submissionStatusEnum('status').notNull().default('STARTED'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    finalScore: integer('final_score'),
    teacherComment: text('teacher_comment'),
  },
  (t) => [index('submissions_user_idx').on(t.userId), index('submissions_status_idx').on(t.status)],
);

export const submissionPages = pgTable(
  'submission_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    fileKey: text('file_key').notNull(),
    pageNo: integer('page_no').notNull(),
  },
  (t) => [unique('submission_pages_uq').on(t.submissionId, t.pageNo)],
);

export const aiReviews = pgTable('ai_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  rawJson: jsonb('raw_json').notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  createdAt: createdAt(),
});

// ─────────────────────────────────── Boshqa ───────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_read_idx').on(t.userId, t.readAt)],
);

// ───────────────────────────────── Relations ─────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  attempts: many(attempts),
  mastery: many(mastery),
  submissions: many(submissions),
  notifications: many(notifications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const sectionsRelations = relations(sections, ({ many }) => ({
  lessons: many(lessons),
  tests: many(tests),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  section: one(sections, { fields: [lessons.sectionId], references: [sections.id] }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  lesson: one(lessons, { fields: [questions.lessonCode], references: [lessons.code] }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, { fields: [questionOptions.questionId], references: [questions.id] }),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  section: one(sections, { fields: [tests.sectionId], references: [sections.id] }),
  questions: many(testQuestions),
  attempts: many(attempts),
}));

export const testQuestionsRelations = relations(testQuestions, ({ one }) => ({
  test: one(tests, { fields: [testQuestions.testId], references: [tests.id] }),
  question: one(questions, { fields: [testQuestions.questionId], references: [questions.id] }),
}));

export const attemptsRelations = relations(attempts, ({ one, many }) => ({
  user: one(users, { fields: [attempts.userId], references: [users.id] }),
  test: one(tests, { fields: [attempts.testId], references: [tests.id] }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  attempt: one(attempts, { fields: [answers.attemptId], references: [attempts.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  task: one(writtenTasks, { fields: [submissions.taskId], references: [writtenTasks.id] }),
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  pages: many(submissionPages),
  aiReviews: many(aiReviews),
}));

export const submissionPagesRelations = relations(submissionPages, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionPages.submissionId],
    references: [submissions.id],
  }),
}));

export const aiReviewsRelations = relations(aiReviews, ({ one }) => ({
  submission: one(submissions, { fields: [aiReviews.submissionId], references: [submissions.id] }),
}));

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type LoginRequest = typeof loginRequests.$inferSelect;
