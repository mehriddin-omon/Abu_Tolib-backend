import { spreadPick } from './testlar.service';

describe('spreadPick', () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      lessonCode: `TENG-0${i % 3}`,
      sectionId: 'T',
    })),
    { id: 's1', lessonCode: 'SON-01', sectionId: 'S' },
    { id: 's2', lessonCode: 'SON-02', sectionId: 'S' },
  ];

  it("bo'limlar bo'ylab teng taqsimlaydi", () => {
    const r = spreadPick(pool, 4, false);
    expect(r).toHaveLength(4);
    expect(r.filter((x) => x.startsWith('s'))).toHaveLength(2);
  });

  it('har darsdan bitta rejimi', () => {
    const r = spreadPick(pool, 30, true);
    expect(r).toHaveLength(5); // TENG: 3 dars + SON: 2 dars
    expect(new Set(r).size).toBe(5);
  });

  it("so'ralganidan ko'p qaytarmaydi va takrorlamaydi", () => {
    const r = spreadPick(pool, 100, false);
    expect(r).toHaveLength(pool.length);
    expect(new Set(r).size).toBe(pool.length);
  });
});
