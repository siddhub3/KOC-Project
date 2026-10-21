import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private lb: LeaderboardService) {}
  @Get(':id/leaderboard')
  async get(@Param('id') id: string) { return this.lb.getLeaderboard(id); }
}
