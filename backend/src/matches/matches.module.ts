import { Module, forwardRef } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MatchesGateway } from './matches.gateway';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';

@Module({
  imports: [TournamentsModule, forwardRef(() => MatchmakingModule)],
  providers: [MatchesService, MatchesGateway],
  controllers: [MatchesController],
  exports: [MatchesService, MatchesGateway]
})
export class MatchesModule {}
