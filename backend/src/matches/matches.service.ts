import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, desc } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.module';
import { matches, tournaments, users } from '../db/schema';
import { Chess } from 'chess.js';

@Injectable()
export class MatchesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async createMatch(tournamentId: string, whiteId: string, blackId: string) {
    const [t] = await this.db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    if (!t) throw new NotFoundException('Tournament not found');
    const initialMs = t.timeControlInitial * 1000;
    const [m] = await this.db.insert(matches).values({
      tournamentId, whitePlayerId: whiteId, blackPlayerId: blackId,
      status: 'ongoing', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '', turn: 'w', whiteTimeMs: initialMs, blackTimeMs: initialMs, moves: [], lastMoveAt: new Date()
    }).returning();
    return m;
  }

  async findOne(id: string) {
    const [m] = await this.db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!m) throw new NotFoundException('Match not found');
    return m;
  }

  async findOneForUser(id: string, userId: string) {
    const match = await this.findOne(id);
    if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    const [tournament] = await this.db.select({
      name: tournaments.name,
      timeControlInitial: tournaments.timeControlInitial,
      timeControlIncrement: tournaments.timeControlIncrement,
    }).from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);
    const [whitePlayer] = await this.db.select({
      id: users.id,
      name: users.name,
    }).from(users).where(eq(users.id, match.whitePlayerId)).limit(1);
    const [blackPlayer] = await this.db.select({
      id: users.id,
      name: users.name,
    }).from(users).where(eq(users.id, match.blackPlayerId)).limit(1);

    return { ...match, tournament, whitePlayer, blackPlayer };
  }

  async findForUser(userId: string) {
    return this.db.select().from(matches).where(or(eq(matches.whitePlayerId, userId), eq(matches.blackPlayerId, userId))).orderBy(desc(matches.createdAt)).limit(20);
  }

  private deductClock(match: any): { whiteTimeMs:number, blackTimeMs:number, timedOut?: 'white'|'black' } {
    const now = new Date();
    const last = new Date(match.lastMoveAt);
    const elapsed = now.getTime() - last.getTime();
    let w = match.whiteTimeMs, b = match.blackTimeMs;
    if (match.turn === 'w') w = Math.max(0, w - elapsed);
    else { /* mover just moved? Actually we deduct from mover who just moved? In our logic we deduct before move from player whose turn it WAS before? Simpler: elapsed since last move is time spent by player whose turn was before move. But we track turn as next player. So elapsed belongs to previous mover. */ }
    // Correct logic: turn indicates who is to move NOW. So elapsed since lastMoveAt is idle? Actually after a move, we set lastMoveAt=now and flip turn. So elapsed since lastMoveAt is time current player has spent thinking.
    // For timeout check, we need to check current player's remaining time minus elapsed.
    let timedOut: 'white'|'black'|undefined;
    if (match.turn === 'w') { const remaining = w - elapsed; if (remaining <= 0) timedOut='white'; }
    else { const remaining = b - elapsed; if (remaining <=0) timedOut='black'; }
    // For move, we will deduct from mover (previous turn). Let's handle in makeMove separately.
    return { whiteTimeMs: w, blackTimeMs: b, timedOut };
  }

  async makeMove(matchId: string, userId: string, from: string, to: string, promotion?: string) {
    const match = await this.findOne(matchId);
    if (match.status !== 'ongoing') throw new BadRequestException('Match not ongoing');
    const isWhite = match.whitePlayerId === userId;
    const isBlack = match.blackPlayerId === userId;
    if (!isWhite && !isBlack) throw new ForbiddenException('Not a participant');
    const expectedTurn = match.turn === 'w' ? 'white' : 'black';
    const actual = isWhite ? 'white' : 'black';
    if (expectedTurn !== actual) throw new BadRequestException('Not your turn');

    // clock timeout check
    const now = new Date();
    const last = new Date(match.lastMoveAt);
    const elapsed = now.getTime() - last.getTime();
    let whiteTime = match.whiteTimeMs, blackTime = match.blackTimeMs;
    if (isWhite) whiteTime = Math.max(0, whiteTime - elapsed);
    else blackTime = Math.max(0, blackTime - elapsed);
    if ((isWhite && whiteTime <=0) || (isBlack && blackTime <=0)) {
      // timeout loss
      const result = isWhite ? 'black_win' : 'white_win';
      const winnerId = isWhite ? match.blackPlayerId : match.whitePlayerId;
      const [updated] = await this.db.update(matches).set({ status: 'completed', result, resultReason: 'timeout', winnerId, whiteTimeMs: whiteTime, blackTimeMs: blackTime, finishedAt: new Date() }).where(eq(matches.id, matchId)).returning();
      return { ...updated, timedOut: true };
    }

    const chess = new Chess(match.fen);
    let move: any;
    try {
      move = chess.move({ from, to, promotion });
    } catch {
      throw new BadRequestException('Illegal move');
    }
    if (!move) throw new BadRequestException('Illegal move');

    const newFen = chess.fen();
    const newPgn = chess.pgn();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();

    let result: any = null, reason: any = null, winnerId: string | null = null, status = 'ongoing';
    if (isCheckmate) { result = isWhite ? 'white_win' : 'black_win'; reason = 'checkmate'; winnerId = userId; status='completed'; }
    else if (isStalemate || isDraw) { result='draw'; reason = isStalemate? 'stalemate':'draw_agreement'; status='completed'; }

    // increment handling
    const [t] = await this.db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);
    const inc = (t?.timeControlIncrement || 0)*1000;
    if (isWhite) whiteTime += inc; else blackTime += inc;

    const newMoves = [...(match.moves as any[]), { from, to, san: move.san, fen: newFen }];

    const [updated] = await this.db.update(matches).set({
      fen: newFen, pgn: newPgn, moves: newMoves, turn: chess.turn(), whiteTimeMs: whiteTime, blackTimeMs: blackTime, lastMoveAt: now,
      ...(status==='completed' ? { status, result, resultReason: reason, winnerId, finishedAt: now } : { status })
    }).where(eq(matches.id, matchId)).returning();

    return updated;
  }

  async resign(matchId: string, userId: string) {
    const match = await this.findOne(matchId);
    if (match.status !== 'ongoing') throw new BadRequestException('Match not ongoing');
    const isWhite = match.whitePlayerId === userId;
    const isBlack = match.blackPlayerId === userId;
    if (!isWhite && !isBlack) throw new ForbiddenException('Not participant');
    const result = isWhite ? 'black_win' : 'white_win';
    const winnerId = isWhite ? match.blackPlayerId : match.whitePlayerId;
    const [updated] = await this.db.update(matches).set({ status:'completed', result, resultReason:'resignation', winnerId, finishedAt: new Date() }).where(eq(matches.id, matchId)).returning();
    return updated;
  }

  async handleTimeout(matchId: string) {
    const match = await this.findOne(matchId);
    if (match.status !== 'ongoing') return match;
    const now = new Date();
    const elapsed = now.getTime() - new Date(match.lastMoveAt).getTime();
    let w = match.whiteTimeMs, b = match.blackTimeMs;
    let timedOut: 'white'|'black'|null = null;
    if (match.turn === 'w') { if (w - elapsed <=0) timedOut='white'; }
    else { if (b - elapsed <=0) timedOut='black'; }
    if (!timedOut) return match;
    const result = timedOut==='white' ? 'black_win' : 'white_win';
    const winnerId = timedOut==='white' ? match.blackPlayerId : match.whitePlayerId;
    const [updated] = await this.db.update(matches).set({
      status:'completed', result, resultReason:'timeout', winnerId, whiteTimeMs: timedOut==='white'?0:w, blackTimeMs: timedOut==='black'?0:b, finishedAt: now
    }).where(eq(matches.id, matchId)).returning();
    return updated;
  }
}
