import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    service = new LeaderboardService(mockDb);
  });

  it('should correctly calculate points, wins, draws, losses, and rank', async () => {
    const tournamentId = 'tourney-1';

    const mockMatches = [
      {
        id: 'm1',
        tournamentId,
        whitePlayerId: 'u1',
        blackPlayerId: 'u2',
        status: 'completed',
        result: 'white_win',
      },
      {
        id: 'm2',
        tournamentId,
        whitePlayerId: 'u2',
        blackPlayerId: 'u3',
        status: 'completed',
        result: 'draw',
      },
      {
        id: 'm3',
        tournamentId,
        whitePlayerId: 'u3',
        blackPlayerId: 'u1',
        status: 'completed',
        result: 'black_win', // u1 wins as black
      },
      {
        id: 'm4',
        tournamentId,
        whitePlayerId: 'u1',
        blackPlayerId: 'u3',
        status: 'ongoing', // uncompleted, should be ignored
        result: null,
      },
    ];

    const mockParticipants = [
      { userId: 'u1', name: 'Alice', email: 'alice@test.com' },
      { userId: 'u2', name: 'Bob', email: 'bob@test.com' },
      { userId: 'u3', name: 'Charlie', email: 'charlie@test.com' },
    ];

    // First select call: matches
    // Second select call: participants with innerJoin
    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockMatches),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockParticipants),
          }),
        }),
      });

    const result = await service.getLeaderboard(tournamentId);

    expect(result.leaderboard).toHaveLength(3);

    // Alice (u1): 2 wins (m1, m3) = 2 points, rank 1
    const alice = result.leaderboard.find((p) => p.id === 'u1');
    expect(alice).toBeDefined();
    expect(alice?.points).toBe(2);
    expect(alice?.wins).toBe(2);
    expect(alice?.draws).toBe(0);
    expect(alice?.losses).toBe(0);
    expect(alice?.played).toBe(2);
    expect((alice as any).rank).toBe(1);

    // Bob (u2): 1 loss (m1), 1 draw (m2) = 0.5 points
    const bob = result.leaderboard.find((p) => p.id === 'u2');
    expect(bob).toBeDefined();
    expect(bob?.points).toBe(0.5);
    expect(bob?.wins).toBe(0);
    expect(bob?.draws).toBe(1);
    expect(bob?.losses).toBe(1);

    // Charlie (u3): 1 draw (m2), 1 loss (m3) = 0.5 points
    const charlie = result.leaderboard.find((p) => p.id === 'u3');
    expect(charlie).toBeDefined();
    expect(charlie?.points).toBe(0.5);
    expect(charlie?.played).toBe(2);
  });
});
