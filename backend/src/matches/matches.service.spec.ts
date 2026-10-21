import { MatchesService } from './matches.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('MatchesService - Move and Turn Validation', () => {
  let service: MatchesService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    };
    service = new MatchesService(mockDb);
  });

  const baseMatch = {
    id: 'match-1',
    tournamentId: 't-1',
    whitePlayerId: 'white-user',
    blackPlayerId: 'black-user',
    status: 'ongoing',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '',
    moves: [],
    turn: 'w',
    whiteTimeMs: 300000,
    blackTimeMs: 300000,
    lastMoveAt: new Date(),
  };

  it('should throw ForbiddenException if user is not a participant', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([baseMatch]),
        }),
      }),
    });

    await expect(
      service.makeMove('match-1', 'outsider-user', 'e2', 'e4'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if it is not the user turn', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([baseMatch]), // turn is 'w'
        }),
      }),
    });

    // black tries to move on white's turn
    await expect(
      service.makeMove('match-1', 'black-user', 'e7', 'e5'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException on illegal chess move', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([baseMatch]),
        }),
      }),
    });

    // e2 to e5 is illegal on opening move
    await expect(
      service.makeMove('match-1', 'white-user', 'e2', 'e5'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully execute a legal move and update state', async () => {
    // 1. findOne query for match
    // 2. select query for tournament increment
    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([baseMatch]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ timeControlIncrement: 2 }]),
          }),
        }),
      });

    const updatedMatch = {
      ...baseMatch,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      turn: 'b',
      moves: [{ from: 'e2', to: 'e4', san: 'e4', fen: '...' }],
    };

    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedMatch]),
        }),
      }),
    });

    const result = await service.makeMove('match-1', 'white-user', 'e2', 'e4');
    expect(result.turn).toBe('b');
    expect(result.fen).toContain('4P3');
  });
});
