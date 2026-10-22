import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DrizzleModule } from './db/drizzle.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { MatchesModule } from './matches/matches.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('JWT_SECRET must be configured in production'); })()
        : 'local_development_only_change_me'),
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d' as any },
    }),
    DrizzleModule,
    AuthModule,
    UsersModule,
    TournamentsModule,
    MatchesModule,
    MatchmakingModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
