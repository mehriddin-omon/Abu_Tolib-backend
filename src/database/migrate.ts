/**
 * Migratsiyalarni qo'llash: `npm run db:migrate` (lokal) yoki
 * `node dist/database/migrate.js` (Docker konteyner ishga tushganda).
 */
import 'dotenv/config';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL berilmagan');
  const pool = new Pool({ connectionString: url, max: 1 });
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  await migrate(drizzle(pool), { migrationsFolder });
  await pool.end();
  console.log('Migratsiyalar qo\'llandi:', migrationsFolder);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
