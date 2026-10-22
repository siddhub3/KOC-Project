import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const db = drizzle(pool);
  console.log('Migrating...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations done');
  await pool.end();
}
main();
