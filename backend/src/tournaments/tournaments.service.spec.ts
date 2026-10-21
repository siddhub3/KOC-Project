import { TournamentsService } from './tournaments.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TournamentsService - Join rules', () => {
  let service: TournamentsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
    };
    service = new TournamentsService(mockDb);
  });

  it('should throw NotFoundException if tournament does not exist', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(service.join('non-existent-id', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should reject joining a tournament that is in draft or completed status', async () => {
    // Draft tournament
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ id: 't-draft', status: 'draft' }]),
        }),
      }),
    });

    await expect(service.join('t-draft', 'user-1')).rejects.toThrow(
      BadRequestException,
    );

    // Completed tournament
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ id: 't-comp', status: 'completed' }]),
        }),
      }),
    });

    await expect(service.join('t-comp', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should allow joining an open tournament and prevent duplicates', async () => {
    const tournament = { id: 't-open', status: 'open' };

    // When user is not yet a participant
    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([tournament]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // no existing participant
          }),
        }),
      });

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'p1', tournamentId: 't-open', userId: 'user-1' }]),
      }),
    });

    const result = await service.join('t-open', 'user-1');
    expect(result).toEqual({ id: 'p1', tournamentId: 't-open', userId: 'user-1' });

    // When user already joined (idempotent / returns existing)
    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([tournament]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'p1', tournamentId: 't-open', userId: 'user-1' }]),
          }),
        }),
      });

    const existingResult = await service.join('t-open', 'user-1');
    expect(existingResult).toEqual({ id: 'p1', tournamentId: 't-open', userId: 'user-1' });
  });
});
