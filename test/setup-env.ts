// E2E testlar alohida bazada ishlaydi: TEST_DATABASE_URL yoki lokal abu_tolib_test
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/abu_tolib_test';
process.env.JWT_ACCESS_SECRET = 'test-secret-0123456789abcdefghijklmnopqrstuvwxyz';
process.env.WEB_URL = 'http://localhost:3000';
process.env.TELEGRAM_BOT_USERNAME = 'abu_tolib_test_bot';
process.env.ADMIN_PHONES = '998900000001';
process.env.AUTH_DEV_LOGIN = 'false';
process.env.SWAGGER_ENABLED = 'false';
