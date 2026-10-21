import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { users, tournaments } from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  console.log('Seeding...');

  const hash = await bcrypt.hash('Coach123!', 10);
  const sHash = await bcrypt.hash('Student123!', 10);

  // upsert coach
  const { eq } = await import('drizzle-orm');
  const existingCoach = await db.select().from(users).where(eq(users.email, 'coach@kingdom.test')).limit(1);
  let coachId: string;
  if (existingCoach.length===0) {
    const [c] = await db.insert(users).values({ email: 'coach@kingdom.test', passwordHash: hash, role: 'coach', name: 'Coach Anand' }).returning();
    coachId = c.id;
  } else coachId = existingCoach[0].id;

  const students = [
    { email: 'student1@kingdom.test', name: 'Arjun' },
    { email: 'student2@kingdom.test', name: 'Priya' },
    { email: 'student3@kingdom.test', name: 'Vikram' },
    { email: 'student4@kingdom.test', name: 'Sara' },
  ];
  for (const s of students) {
    const ex = await db.select().from(users).where(eq(users.email, s.email)).limit(1);
    if (ex.length===0) await db.insert(users).values({ email: s.email, passwordHash: sHash, role: 'student', name: s.name });
  }

  const exTour = await db.select().from(tournaments).limit(1);
  if (exTour.length===0) {
    await db.insert(tournaments).values({
      name: 'Kingdom Beginners Cup', timeControlInitial: 300, timeControlIncrement: 0, startDate: new Date(Date.now()+24*3600*1000), status: 'open', createdById: coachId
    });
    console.log('Created sample tournament');
  }

  console.log('Seed done');
  console.log('Credentials: coach@kingdom.test / Coach123! ; student1-4@kingdom.test / Student123!');
  await pool.end();
}
main();
