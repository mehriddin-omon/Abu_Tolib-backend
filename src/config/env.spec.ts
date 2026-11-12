import { validateEnv } from './env';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
};

describe('validateEnv', () => {
  it("standart qiymatlarni to'ldiradi", () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.AUTH_DEV_LOGIN).toBe(false);
  });

  it('ADMIN_PHONES ni raqamlarga ajratadi', () => {
    const env = validateEnv({ ...base, ADMIN_PHONES: '+998 90 123-45-67, 998911112233,' });
    expect(env.ADMIN_PHONES).toEqual(['998901234567', '998911112233']);
  });

  it('qisqa JWT kalitini rad etadi', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });
});
