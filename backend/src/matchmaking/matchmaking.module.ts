import { Module, forwardRef } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchesModule } from '../matches/matches.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [forwardRef(() => MatchesModule), TournamentsModule],
  providers: [MatchmakingService],
  exports: [MatchmakingService]
})
export class MatchmakingModule {}
