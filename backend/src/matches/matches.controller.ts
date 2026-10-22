import { Controller, Get, Param, Post, UseGuards, Body } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private service: MatchesService) {}
  @Get('my/history')
  myHistory(@CurrentUser() user: any) { return this.service.findForUser(user.sub); }
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneForUser(id, user.sub);
  }
}
