# Kingdom of Chess — Frontend

Next.js 15 + React 19 tournament module with live 1-on-1 play.

## Setup

```bash
cp .env.example .env.local # NEXT_PUBLIC_API_URL=http://localhost:3001 (or https://.../api/v1 accepted)
npm install
npm run dev # port 3000
```

Backend expected at `NEXT_PUBLIC_API_URL` (NestJS). Client appends `/api/v1` if missing. JWT is httpOnly cookie, so `fetch` uses `credentials: "include"` and Socket.IO uses `withCredentials: true`.

## Flow

- `/login` — email+password, stores JWT cookie via backend.
- `/` — redirects by role: coach → `/coach/tournaments`, student → `/student/tournaments`.
- Coach: CRUD tournaments (name, timeControl e.g. 5+0, start date, status). View detail: stats, leaderboard, participants, matches. Status controls visibility.
- Student: browse open/ongoing, join tournament, "Find Opponent" button → POST `/tournaments/:id/queue/join`. Server FIFO auto-pairs (in-memory Map, at most one match per player). Socket `match:paired {matchId, tournamentId}` pushes both players directly to `/play/[matchId]` (no refresh).
- `/play/[matchId]` headline:
  - Fetches match REST for initial FEN/PGN/clocks.
  - Joins socket room `match:{id}` via `match:join`.
  - Server authoritative: validates moves with chess.js, deducts clock elapsed on move, checks timeout via interval, handles checkmate/stalemate/timeout/resignation/draw.
  - Client shows live board (react-chessboard), shared clock countdown (optimistic tick from lastMoveAt), PGN panel, resign/draw buttons.
  - Result saved → leaderboard win=1 draw=0.5 loss=0 computed server-side.

## Socket event list

Client → Server:
- `match:join {matchId}` — join match room, receive current state
- `match:leave {matchId}`
- `match:move {matchId, from, to, promotion}` — server validates, updates clocks, broadcasts
- `match:resign {matchId}`
- `match:offerDraw {matchId}`
- `match:acceptDraw {matchId}`
- `match:declineDraw {matchId}`
- `tournament:queue:join {tournamentId}` (alternative to REST)
- `tournament:queue:leave {tournamentId}`

Server → Client:
- `match:paired {matchId, tournamentId}` — sent to both queued players, triggers navigation
- `match:state {id, tournamentId, whiteId, blackId, whiteName, blackName, fen, pgn, whiteTimeMs, blackTimeMs, turn, status, result, reason, lastMoveAt}`
- `match:move {from, to, promotion, fen, pgn, san, whiteTimeMs, blackTimeMs, turn, lastMoveAt}`
- `match:result {result: white|black|draw, reason: checkmate|resignation|timeout|stalemate|drawAgreement|... , pgn, fen, whiteTimeMs, blackTimeMs}`
- `match:drawOffered {by, byName}`
- `match:drawDeclined`
- `match:error {message}`
- `tournament:queue:status {tournamentId, status: queued|idle}`

## Tech choices & trade-offs

- `react-chessboard` + `chess.js`: spec requires not reinventing rules. Local chess.js for instant legality feedback; server authoritative for final validation (prevents desync/cheating).
- TanStack Query for all REST: caching, invalidation after mutations, loading/error/empty states consistent.
- Socket.IO client singleton: withCredentials for cookie auth, auto-reconnect.
- Clock: server stores whiteTimeMs/blackTimeMs and lastMoveAt. On move, elapsed deducted from mover. Client ticks optimistically using `timeMs - (now - lastMoveAt)`. Timeout check via server interval (60 FPS not needed, 1s check).
- Matchmaking: in-memory Map tournamentId -> queue array. FIFO simple satisfies concurrency test (at most one active match per player enforced with activeMatches map). Standing-based pairing is stretch; noted as future improvement.
- Security: Socket gateway checks JWT from cookie handshake, verifies user is participant of match room (or coach spectator).
- Error handling: every page has loading spinner, error card with message, empty state text ("No tournaments yet", etc.).
- App Router strict: all interactive logic in client components (`"use client"`), layout wraps Providers.
- Tailwind + minimal shadcn: button/card/input/badge built from scratch to pass without Radix dependency, but API matches shadcn/ui.

## Seed credentials (as per backend README)

```
coach@kingdom.com / Coach123!
alice@student.com / Student123!
bob@student.com / Student123!
carol@student.com / Student123!
dave@student.com / Student123!
```

## How to play a match locally

1. Run backend (`docker compose up` or `npm run start:dev` at 3001) and seed.
2. Run frontend (`npm run dev` at 3000).
3. Open two browsers (or normal + incognito): login as Alice and Bob.
4. Both join same open tournament (`/student/tournaments/:id` → Join).
5. Both click "Find Opponent". One will queue; second triggers auto-pair.
6. Both receive `match:paired` and auto-redirect to `/play/:matchId` where moves sync live, clocks countdown, PGN updates.
7. Check leaderboard on tournament page after game ends.

## Future improvements

- Move-list navigation (click PGN to review position) — store FEN per ply.
- Increment handling (e.g., 5+3): add increment after each move if timeControl parses "+".
- Reconnection: persist socket room join with matchId, restore board from REST on refresh (already does).
- Spectator mode for coach (currently allowed as orientation white but board disabled).
- Threefold repetition, 50-move rule detection server-side.
