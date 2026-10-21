import {
  Injectable,
  Inject,
  BadRequestException,
  forwardRef,
} from "@nestjs/common";
import { eq, and, or } from "drizzle-orm";
import { DRIZZLE } from "../db/drizzle.module";
import { matches } from "../db/schema";
import { MatchesService } from "../matches/matches.service";
import { TournamentsService } from "../tournaments/tournaments.service";

@Injectable()
export class MatchmakingService {
  private queues = new Map<string, string[]>();
  private queueSet = new Map<string, Set<string>>();
  constructor(
    @Inject(DRIZZLE) private db: any,
    @Inject(forwardRef(() => MatchesService))
    private matchesService: MatchesService,
    @Inject(forwardRef(() => TournamentsService))
    private tournamentsService: TournamentsService,
  ) {}
  private getQueue(tournamentId: string): string[] {
    if (!this.queues.has(tournamentId)) {
      this.queues.set(tournamentId, []);
      this.queueSet.set(tournamentId, new Set());
    }
    return this.queues.get(tournamentId)!;
  }
  private getSet(tournamentId: string): Set<string> {
    return this.queueSet.get(tournamentId)!;
  }
  async addToQueue(tournamentId: string, userId: string) {
    const isParticipant = await this.tournamentsService.isParticipant(
      tournamentId,
      userId,
    );
    if (!isParticipant) throw new BadRequestException("Join tournament first");
    const active = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          or(eq(matches.status, "ongoing"), eq(matches.status, "pending")),
          or(
            eq(matches.whitePlayerId, userId),
            eq(matches.blackPlayerId, userId),
          ),
        ),
      )
      .limit(1);
    if (active.length)
      throw new BadRequestException("You are already in a live match");
    const q = this.getQueue(tournamentId);
    const s = this.getSet(tournamentId);
    if (s.has(userId)) return { queued: true, position: q.indexOf(userId) + 1 };
    q.push(userId);
    s.add(userId);
    const result = await this.tryPair(tournamentId);
    if (result) return { paired: true, match: result };
    return { queued: true, position: q.length };
  }
  async tryPair(tournamentId: string) {
    const q = this.getQueue(tournamentId);
    if (q.length < 2) return null;
    const whiteId = q.shift()!;
    const blackId = q.shift()!;
    this.getSet(tournamentId).delete(whiteId);
    this.getSet(tournamentId).delete(blackId);
    const activeMatches = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          or(eq(matches.status, "ongoing"), eq(matches.status, "pending")),
          or(
            eq(matches.whitePlayerId, whiteId),
            eq(matches.blackPlayerId, whiteId),
            eq(matches.whitePlayerId, blackId),
            eq(matches.blackPlayerId, blackId),
          ),
        ),
      );
    if (activeMatches.length > 0) {
      const activeUserIds = new Set<string>();
      for (const m of activeMatches) {
        activeUserIds.add(m.whitePlayerId);
        activeUserIds.add(m.blackPlayerId);
      }
      if (!activeUserIds.has(whiteId)) {
        q.unshift(whiteId);
        this.getSet(tournamentId).add(whiteId);
      }
      if (!activeUserIds.has(blackId)) {
        q.unshift(blackId);
        this.getSet(tournamentId).add(blackId);
      }
      return null;
    }
    const match = await this.matchesService.createMatch(
      tournamentId,
      whiteId,
      blackId,
    );
    return match;
  }
  leaveQueue(tournamentId: string, userId: string) {
    const q = this.getQueue(tournamentId);
    const idx = q.indexOf(userId);
    if (idx !== -1) {
      q.splice(idx, 1);
      this.getSet(tournamentId).delete(userId);
    }
    return { left: true };
  }
  getQueueStatus(tournamentId: string) {
    return this.getQueue(tournamentId);
  }
}
