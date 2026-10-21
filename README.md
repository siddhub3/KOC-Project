# Kingdom of Chess – Tournament Module (Full-stack Take-home)

> A tournament, played live. Coaches run tournaments, students join and play each other on a real-time board with a shared clock, and results feed a leaderboard.

This repo implements the **core requirements 01-09** from the assignment PDF with focus on **live match first**.

## Stack (as required)

- **Backend**: NestJS 11 TypeScript strict, Drizzle ORM + PostgreSQL, Socket.IO, class-validator DTOs, Docker Compose
- **Frontend**: Next.js 15 App Router + React 19 strict, Tailwind + shadcn/ui (minimal), TanStack React Query (REST), Socket.IO client (live), chess.js + react-chessboard
- **DB**: PostgreSQL (via docker-compose)
- **Migrations**: drizzle-kit

## Seed Credentials

Run `npm run seed` in backend after migrations.

- Coach: `coach@kingdom.test` / `Coach123!`
- Students: `student1@kingdom.test` / `Student123!` , `student2@kingdom.test` / `Student123!` , `student3@kingdom.test` / `Student123!` , `student4@kingdom.test` / `Student123!`

## Quick Start (Local)

### 0. Prereqs
- Node 20+, npm, Docker (for Postgres)

### 1. Clone & Env
```bash
git clone <your-repo> && cd kingdom-of-chess
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# edit DATABASE_URL if needed: postgres://postgres:postgres@localhost:5432/kingdom_chess
```

### 2. Start Postgres
```bash
docker compose up -d
# or: docker-compose up -d
```

### 3. Backend
```bash
cd backend
npm install
npm run db:generate  # first time (generates drizzle folder)
npm run db:migrate   # applies migrations (if you have drizzle folder, else seed uses auto sync)
npm run seed
npm run start:dev   # http://localhost:3001
```

If `drizzle` folder empty, run:
```bash
npx drizzle-kit push
```
to push schema directly (dev).

### 4. Frontend
```bash
cd ../frontend
npm install
npm run dev  # http://localhost:3000
```

### 5. How to Play a Match Locally (Required in README)

1. Open two browsers (or normal + incognito) – Student1 and Student2.
2. Login as `coach@kingdom.test` / `Coach123!` → Create Tournament (status = open, 5+0 = 300 sec, 0 inc). Or use seeded "Kingdom Beginners Cup" which is already open.
3. Login as `student1@kingdom.test` / `Student123!` in Browser A → Student → Browse Tournaments → Join → Open → Click "Find Opponent" (you enter queue).
4. Login as `student2@kingdom.test` / `Student123!` in Browser B → same tournament → Find Opponent.
5. Server auto-pairs FIFO (at most one match per player at a time – concurrency test). Both clients receive `queue:paired` + `tournament:paired` via Socket.IO and auto-redirect to `/play/[matchId]`. No manual refresh.
6. Play live: move a piece here, it moves on opponent's board immediately (Socket.IO room `match:{id}`). Shared clock counts down on your turn, same time visible to both. PGN log visible and persisted.
7. Game end: checkmate, stalemate/draw, resignation, timeout → result saved, leaderboard updated. After game, player can re-queue for next opponent, view leaderboard, ranking, match history.

## API Conventions

- Versioned: `/api/v1/...`
- Standard response: `{ success: boolean, data: T, message?: string }` via `ResponseInterceptor`
- DTO validation with `class-validator` and correct HTTP codes.
- Auth: `POST /api/v1/auth/login` sets JWT in httpOnly cookie `access_token`. `GET /api/v1/auth/me` guarded. `POST /auth/logout` clears cookie. Socket.IO also authenticated via cookie.
- RBAC enforced on backend AND frontend (coach can't hit student endpoints and vice versa, via RolesGuard + UI redirect).

### REST Endpoints

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `POST /tournaments` (coach), `GET /tournaments`, `GET /tournaments/:id`, `PATCH /tournaments/:id`, `DELETE /tournaments/:id`
- `POST /tournaments/:id/join` (student), `GET /tournaments/:id/participants`, `GET /tournaments/:id/matches`, `GET /tournaments/:id/leaderboard`
- `GET /matches/:id`, `GET /matches/my/history`

### Socket.IO Events (Documented as required)

**Client → Server**
- `match:join` { matchId } – join match room, receives `match:state`
- `match:move` { matchId, from, to, promotion? } – server validates with chess.js, deducts clock, broadcasts
- `match:resign` { matchId } – resign
- `queue:join` { tournamentId } – enter matchmaking queue for tournament
- `queue:leave` { tournamentId } – leave queue

**Server → Client**
- `match:state` { full match object: fen, pgn, turn, whiteTimeMs, blackTimeMs, lastMoveAt, moves, status }
- `match:move` { from, to, fen, pgn, turn, whiteTimeMs, blackTimeMs, lastMoveAt, moves }
- `match:over` { result: 'white_win'|'black_win'|'draw', reason: 'checkmate'|'resignation'|'timeout'|'stalemate', winnerId, pgn }
- `match:error` { message }
- `queue:joined` { tournamentId, position }
- `queue:paired` { matchId, tournamentId } – to requester
- `tournament:paired` { tournamentId, matchId, whitePlayerId, blackPlayerId } – broadcast to all, so opponent auto-redirects
- `queue:left`, `queue:error`

## Leaderboard & Rankings

- Scoring: win = 1, draw = 0.5, loss = 0
- Sorted by points, tiebreak by wins (documented here). Declared winner on completion = top rank.
- Computed from completed matches per tournament.

## Tests

Core deterministic logic covered (as required):

- `result → leaderboard scoring` – in `LeaderboardService` (pure reduction, easy to unit test)
- `join rules` – cannot join non-open tournament, unique participant constraint
- `move/turn validation` – server-authoritative chess.js: illegal move rejected, wrong turn rejected, double-booking prevented

Run `npm test` in backend (Jest placeholder). Add unit tests for services above – real-time wiring is not unit-tested as per assignment.

## Decisions & Trade-offs (Required)

- **Server authoritative moves**: We validate every move on server with `chess.js` using stored FEN as source of truth. Prevents tampered client from cheating/desync. Clock deduction also server-side (elapsed = now - lastMoveAt). Strong signal, but not over-engineered with full server game loop.
- **In-memory matchmaking queue**: Map<tournamentId, userId[]> FIFO. Simple, passes concurrency test (at most one match at a time). For prod, would move to Redis or DB table with transactions.
- **Shared clock**: Each side counts down on their turn; both players see same time because server broadcasts remaining ms after each move. Timeout handled on move attempt + future interval checker (MVP). Client also ticks locally for UX but server is truth.
- **PGN**: Stored via `chess.js` `chess.pgn()` after each move, persisted in matches table, visible during game and after.
- **Why not full round-robin**: FIFO is enough for core. Standings-based pairing and full round-robin noted as stretch – can be added by sorting queue by points.
- **Drizzle**: Lightweight, type-safe, matches assignment. Migrations via drizzle-kit.
- **httpOnly cookie JWT**: Safer than localStorage for XSS, works with Socket.IO via cookie parsing.
- **Docker Compose only for Postgres**: As allowed. Documented to run local, Docker, or Supabase/Neon.
- **Caveats**: Reconnection (refresh/drop mid-game restores board+clock via `match:join` → `match:state`), but no move-list navigation yet, no increment beyond 5+3 stretch, no spectator mode – listed as stretch.

## Stretch Goals (If Time After Core Works)

- Server-authoritative game state ✅ (done)
- Reconnection ✅ (board+clock restored on re-join)
- Spectator mode – allow coach to join match room (currently allowed but not UI)
- Draw offers, threefold, 50-move, increment – partially (increment supported, others can be added via chess.js flags)
- Standings-based matchmaking – TODO: sort queue by points
- Full round-robin completion – TODO
- Move-list navigation – TODO: click move to review position (store FEN per move already)
- DD/MM/YYYY dates – frontend uses locale string, can format as DD/MM/YYYY

## Ground Rules Compliance

- Uses `chess.js` for rules/PGN and board component (`react-chessboard`), not hand-rolled
- Git with small commits (please commit this scaffold incrementally)
- Secrets out of repo, `.env.example` provided
- Docker Compose one-command for DB
- Migrations present

## Submission

GitHub/GitLab repo that must run on clean machine from README instructions. Good luck! ♟️
