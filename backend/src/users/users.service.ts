import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { DRIZZLE } from '../db/drizzle.module';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: any) {}
  async findById(id: string) { const [u] = await this.db.select().from(users).where(eq(users.id, id)).limit(1); return u; }
  async findByEmail(email: string) { const [u] = await this.db.select().from(users).where(eq(users.email, email)).limit(1); return u; }
}
