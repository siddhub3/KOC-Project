import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
import * as schema from './schema';
async function main(){
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  // For dev we use drizzle-kit push, this file is placeholder
  console.log('Use npx drizzle-kit push --config=drizzle.config.ts');
  await pool.end();
}
main();
