import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.module';
import { matches, participants, users } from '../db/schema';

@Injectable()
export class LeaderboardService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getLeaderboard(tournamentId: string) {
    const allMatches = await this.db.select().from(matches).where(eq(matches.tournamentId, tournamentId));
    const partRows = await this.db.select({ userId: participants.userId, name: users.name, email: users.email }).from(participants).innerJoin(users, eq(participants.userId, users.id)).where(eq(participants.tournamentId, tournamentId));
    const stats = new Map<string, { id:string, name:string, email:string, points:number, wins:number, draws:number, losses:number, played:number }>();
    for (const p of partRows) stats.set(p.userId, { id: p.userId, name: p.name, email: p.email, points:0, wins:0, draws:0, losses:0, played:0 });
    for (const m of allMatches) {
      if (m.status !== 'completed' || !m.result) continue;
      const white = stats.get(m.whitePlayerId); const black = stats.get(m.blackPlayerId);
      if (!white || !black) continue;
      white.played++; black.played++;
      if (m.result === 'white_win') { white.points+=1; white.wins++; black.losses++; }
      else if (m.result === 'black_win') { black.points+=1; black.wins++; white.losses++; }
      else { white.points+=0.5; black.points+=0.5; white.draws++; black.draws++; }
    }
    const leaderboard = Array.from(stats.values()).sort((a,b)=> b.points - a.points || b.wins - a.wins);
    leaderboard.forEach((e,i)=> (e as any).rank = i+1);
    return { leaderboard, matches: allMatches };
  }
}
