import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { tournaments, participants, users, matches } from '../db/schema';
import { DRIZZLE } from '../db/drizzle.module';
import { alias } from 'drizzle-orm/pg-core';

@Injectable()
export class TournamentsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(dto: any, coachId: string) {
    const [t] = await this.db.insert(tournaments).values({
      name: dto.name, timeControlInitial: dto.timeControlInitial, timeControlIncrement: dto.timeControlIncrement,
      startDate: new Date(dto.startDate), status: dto.status || 'draft', createdById: coachId
    }).returning();
    return t;
  }
  async findAll(role: string, userId?: string) {
    if (role === 'coach') return this.db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
    // students see open/ongoing
    const { or } = await import('drizzle-orm');
    return this.db.select().from(tournaments).where(or(eq(tournaments.status, 'open'), eq(tournaments.status, 'ongoing'))).orderBy(desc(tournaments.startDate));
  }
  async findOne(id: string) {
    const [t] = await this.db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!t) throw new NotFoundException('Tournament not found');
    return t;
  }
  async update(id: string, dto: any, coachId: string) {
    const t = await this.findOne(id);
    if (t.createdById !== coachId) throw new ForbiddenException('Not owner');
    const [updated] = await this.db.update(tournaments).set({
      ...(dto.name && { name: dto.name }),
      ...(dto.timeControlInitial && { timeControlInitial: dto.timeControlInitial }),
      ...(dto.timeControlIncrement !== undefined && { timeControlIncrement: dto.timeControlIncrement }),
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.status && { status: dto.status }),
    }).where(eq(tournaments.id, id)).returning();
    return updated;
  }
  async remove(id: string, coachId: string) {
    const t = await this.findOne(id);
    if (t.createdById !== coachId) throw new ForbiddenException('Not owner');
    await this.db.delete(tournaments).where(eq(tournaments.id, id));
    return { deleted: true };
  }
  async join(tournamentId: string, userId: string) {
    const t = await this.findOne(tournamentId);
    if (!['open','ongoing'].includes(t.status)) throw new BadRequestException('Tournament not open for joining');
    const existing = await this.db.select().from(participants).where(and(eq(participants.tournamentId, tournamentId), eq(participants.userId, userId))).limit(1);
    if (existing.length) return existing[0];
    const [p] = await this.db.insert(participants).values({ tournamentId, userId }).returning();
    return p;
  }
  async listParticipants(tournamentId: string) {
    await this.findOne(tournamentId);
    const rows = await this.db.select({ id: users.id, email: users.email, name: users.name, joinedAt: participants.joinedAt })
      .from(participants).innerJoin(users, eq(participants.userId, users.id)).where(eq(participants.tournamentId, tournamentId));
    return rows;
  }
  async listMatches(tournamentId: string) {
    const whitePlayer = alias(users, 'white_player');
    const blackPlayer = alias(users, 'black_player');
    return this.db.select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      whitePlayerId: matches.whitePlayerId,
      blackPlayerId: matches.blackPlayerId,
      whitePlayer: { id: whitePlayer.id, name: whitePlayer.name },
      blackPlayer: { id: blackPlayer.id, name: blackPlayer.name },
      status: matches.status,
      result: matches.result,
      resultReason: matches.resultReason,
      winnerId: matches.winnerId,
      createdAt: matches.createdAt,
      finishedAt: matches.finishedAt,
    }).from(matches)
      .leftJoin(whitePlayer, eq(matches.whitePlayerId, whitePlayer.id))
      .leftJoin(blackPlayer, eq(matches.blackPlayerId, blackPlayer.id))
      .where(eq(matches.tournamentId, tournamentId))
      .orderBy(desc(matches.createdAt));
  }
  async isParticipant(tournamentId: string, userId: string) {
    const r = await this.db.select().from(participants).where(and(eq(participants.tournamentId, tournamentId), eq(participants.userId, userId))).limit(1);
    return r.length > 0;
  }
}
