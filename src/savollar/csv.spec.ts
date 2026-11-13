import { parseCsv } from './csv';

describe('parseCsv', () => {
  it("vergul, qo'shtirnoq va qator ichidagi yangi qator", () => {
    const rows = parseCsv('a,b,c\n1,"x, y","ko\'p\nqator"\r\n2,"""q""",\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', "ko'p\nqator"],
      ['2', '"q"', ''],
    ]);
  });

  it('nuqta-vergulni avtomatik aniqlaydi va BOM ni olib tashlaydi', () => {
    expect(parseCsv('\uFEFFkod;matn\nTENG-04;$x^2, y$')).toEqual([
      ['kod', 'matn'],
      ['TENG-04', '$x^2, y$'],
    ]);
  });

  it("bo'sh qatorlarni tashlab yuboradi", () => {
    expect(parseCsv('a,b\n\n,\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
