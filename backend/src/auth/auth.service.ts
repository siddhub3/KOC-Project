import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { DRIZZLE } from '../db/drizzle.module';

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private db: any, private jwt: JwtService) {}
  async validateUser(email: string, password: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = await this.jwt.signAsync(payload);
    return { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } };
  }
  async me(userId: string) {
    const [user] = await this.db.select({ id: users.id, email: users.email, role: users.role, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    return user;
  }
}
