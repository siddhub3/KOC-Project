import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('tournaments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TournamentsController {
  constructor(private service: TournamentsService) {}

  @Roles('coach') @Post()
  create(@Body() dto: CreateTournamentDto, @CurrentUser() user: any) { return this.service.create(dto, user.sub); }

  @Get()
  findAll(@CurrentUser() user: any) { return this.service.findAll(user.role, user.sub); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Roles('coach') @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTournamentDto, @CurrentUser() user: any) { return this.service.update(id, dto, user.sub); }

  @Roles('coach') @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) { return this.service.remove(id, user.sub); }

  @Roles('student') @Post(':id/join')
  join(@Param('id') id: string, @CurrentUser() user: any) { return this.service.join(id, user.sub); }

  @Get(':id/participants')
  participants(@Param('id') id: string) { return this.service.listParticipants(id); }

  @Get(':id/matches')
  matches(@Param('id') id: string) { return this.service.listMatches(id); }
}
