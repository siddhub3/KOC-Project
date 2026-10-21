import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['coach', 'student']);
export const tournamentStatusEnum = pgEnum('tournament_status', ['draft', 'open', 'ongoing', 'completed']);
export const matchStatusEnum = pgEnum('match_status', ['pending', 'ongoing', 'completed']);
export const matchResultEnum = pgEnum('match_result', ['white_win', 'black_win', 'draw']);
export const resultReasonEnum = pgEnum('result_reason', ['checkmate', 'resignation', 'timeout', 'stalemate', 'draw_agreement', 'threefold', 'fifty_move']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  timeControlInitial: integer('time_control_initial').notNull(), // seconds e.g. 300
  timeControlIncrement: integer('time_control_increment').notNull().default(0),
  startDate: timestamp('start_date').notNull(),
  status: tournamentStatusEnum('status').notNull().default('draft'),
  createdById: uuid('created_by_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const participants = pgTable('participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('participants_tournament_user_uniq').on(t.tournamentId, t.userId),
}));

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  whitePlayerId: uuid('white_player_id').references(() => users.id).notNull(),
  blackPlayerId: uuid('black_player_id').references(() => users.id).notNull(),
  status: matchStatusEnum('status').notNull().default('ongoing'),
  result: matchResultEnum('result'),
  resultReason: resultReasonEnum('result_reason'),
  winnerId: uuid('winner_id').references(() => users.id),
  pgn: text('pgn').notNull().default(''),
  fen: varchar('fen', { length: 255 }).notNull().default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  moves: jsonb('moves').$type<{from:string,to:string,san:string,fen:string}[]>().default([]).notNull(),
  turn: varchar('turn', { length: 1 }).notNull().default('w'),
  whiteTimeMs: integer('white_time_ms').notNull(),
  blackTimeMs: integer('black_time_ms').notNull(),
  lastMoveAt: timestamp('last_move_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
});
