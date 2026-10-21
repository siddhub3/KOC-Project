import { Injectable, Inject, BadRequestException, forwardRef } from '@nestjs/common';
import { eq, and, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.module';
import { matches, participants } from '../db/schema';
import { MatchesService } from '../matches/matches.service';
import { TournamentsService } from '../tournaments/tournaments.service';

@Injectable()
export class MatchmakingService {
  // tournamentId -> queue of userIds
  private queues = new Map<string, string[]>();
  private queueSet = new Map<string, Set<string>>(); // quick dedup

  constructor(@Inject(DRIZZLE) private db: any, @Inject(forwardRef(()=>MatchesService)) private matchesService: MatchesService, private tournamentsService: TournamentsService) {}

  private getQueue(tournamentId: string): string[] {
    if (!this.queues.has(tournamentId)) { this.queues.set(tournamentId, []); this.queueSet.set(tournamentId, new Set()); }
    return this.queues.get(tournamentId)!;
  }
  private getSet(tournamentId: string): Set<string> { return this.queueSet.get(tournamentId)!; }

  async addToQueue(tournamentId: string, userId: string) {
    const isParticipant = await this.tournamentsService.isParticipant(tournamentId, userId);
    if (!isParticipant) throw new BadRequestException('Join tournament first');
    // at most one match at a time
    const active = await this.db.select().from(matches).where(and(eq(matches.tournamentId, tournamentId), or(eq(matches.status, 'ongoing'), eq(matches.status, 'pending')), or(eq(matches.whitePlayerId, userId), eq(matches.blackPlayerId, userId)))).limit(1);
    if (active.length) throw new BadRequestException('You are already in a live match for this tournament');
    const q = this.getQueue(tournamentId);
    const s = this.getSet(tournamentId);
    if (s.has(userId)) return { queued: true, position: q.indexOf(userId)+1 };
    q.push(userId); s.add(userId);
    // try pair
    const result = await this.tryPair(tournamentId);
    if (result) return { paired: true, match: result };
    return { queued: true, position: q.length };
  }

  async tryPair(tournamentId: string) {
    const q = this.getQueue(tournamentId);
    if (q.length < 2) return null;
    // FIFO: take first two
    const whiteId = q.shift()!;
    const blackId = q.shift()!;
    this.getSet(tournamentId).delete(whiteId); this.getSet(tournamentId).delete(blackId);
    // double-check not double-booked (race)
    const { or: orFn } = await import('drizzle-orm');
    // ensure both not in active matches
    const check = await this.db.select().from(matches).where(and(eq(matches.tournamentId, tournamentId), orFn(eq(matches.status, 'ongoing'), eq(matches.status, 'pending')), orFn(eq(matches.whitePlayerId, whiteId), eq(matches.blackPlayerId, whiteId), eq(matches.whitePlayerId, blackId), eq(matches.blackPlayerId, blackId)))).limit(1);
    if (check.length) {
      // put back if conflict
      if (!this.getSet(tournamentId).has(whiteId)) { q.unshift(whiteId); this.getSet(tournamentId).add(whiteId); }
      return null;
    }
    const match = await this.matchesService.createMatch(tournamentId, whiteId, blackId);
    return match;
  }

  leaveQueue(tournamentId: string, userId: string) {
    const q = this.getQueue(tournamentId);
    const idx = q.indexOf(userId);
    if (idx !== -1) { q.splice(idx,1); this.getSet(tournamentId).delete(userId); }
    return { left: true };
  }

  getQueueStatus(tournamentId: string) { return this.getQueue(tournamentId); }

  enqueue(tournamentId: string, userId: string) { return this.addToQueue(tournamentId, userId); }
  dequeue(tournamentId: string, userId: string) { return this.leaveQueue(tournamentId, userId); }
  getQueueState(tournamentId: string) { return this.getQueueStatus(tournamentId); }
}
