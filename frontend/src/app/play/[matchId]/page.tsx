'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChessBoardLive } from '@/components/ChessBoardLive';
import { Clock } from '@/components/Clock';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

type Player = { id: string; name: string };
type Move = { from: string; to: string; san: string; fen: string };
type Match = {
  id: string;
  tournamentId: string;
  tournament?: { name: string; timeControlInitial: number; timeControlIncrement: number };
  whitePlayerId: string;
  blackPlayerId: string;
  whitePlayer?: Player;
  blackPlayer?: Player;
  status: string;
  result: string | null;
  resultReason?: string | null;
  winnerId: string | null;
  pgn: string;
  fen: string;
  moves: Move[];
  turn: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: string;
  createdAt: string;
  finishedAt?: string | null;
};
type MatchOver = { result: string; reason?: string; winnerId?: string | null; pgn?: string };

function titleCase(value?: string | null) {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimeControl(initial?: number, increment?: number) {
  if (initial === undefined) return '—';
  return `${Math.floor(initial / 60)}+${increment ?? 0}`;
}

function PlayerPanel({
  player,
  color,
  isYou,
  timeMs,
  lastMoveAt,
  active,
  finished,
}: {
  player?: Player;
  color: 'White' | 'Black';
  isYou: boolean;
  timeMs: number;
  lastMoveAt: string;
  active: boolean;
  finished: boolean;
}) {
  const name = player?.name || `${color} player`;
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`match-player ${active && !finished ? 'match-player-active' : ''}`}>
      <div className="match-player-identity">
        <div className={`player-avatar ${color === 'White' ? 'player-avatar-white' : 'player-avatar-black'}`}>
          {initials || color[0]}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{name}</span>
            {isYou && <span className="you-chip">YOU</span>}
          </div>
          <span className="text-xs text-slate-500">{color} pieces</span>
        </div>
      </div>
      <Clock
        timeMs={timeMs}
        lastMoveAt={lastMoveAt}
        active={active && !finished}
        label={color}
      />
    </div>
  );
}

function GameResultOverlay({
  result,
  reason,
  winnerId,
  currentUserId,
  onReturn,
}: {
  result: MatchOver;
  reason?: string;
  winnerId?: string | null;
  currentUserId?: string;
  onReturn: () => void;
}) {
  const didWin = Boolean(winnerId && currentUserId && winnerId === currentUserId);
  const isDraw = result.result === 'draw';
  const heading = isDraw ? 'Draw game' : didWin ? 'Victory!' : 'Game over';
  const resultLabel = isDraw ? 'The game ended in a draw' : `${titleCase(result.result)} by ${titleCase(reason || result.reason)}`;

  return (
    <div className="game-result-overlay" role="status" aria-live="assertive">
      <div className="result-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
      </div>
      <section className="game-result-card">
        <div className={`result-emblem ${didWin ? 'result-emblem-win' : ''}`} aria-hidden="true">
          {isDraw ? '½' : didWin ? '♛' : '♟'}
        </div>
        <p className="result-eyebrow">MATCH COMPLETE</p>
        <h2>{heading}</h2>
        <p className="result-description">{resultLabel}</p>
        <Button onClick={onReturn} className="mt-5 w-full">Back to tournament</Button>
      </section>
    </div>
  );
}

export default function PlayPage() {
  const { matchId } = useParams() as { matchId: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useAuth();
  const { data: initial, isLoading, isError, error } = useQuery<Match>({
    queryKey: ['match', matchId],
    queryFn: () => api.get(`/matches/${matchId}`),
  });
  const [match, setMatch] = useState<Match | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [gameOver, setGameOver] = useState<MatchOver | null>(null);
  const [socketError, setSocketError] = useState('');
  const [resigning, setResigning] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setMatch(initial);
    if (initial.status === 'completed' && initial.result) {
      setGameOver({ result: initial.result, reason: initial.resultReason || undefined, winnerId: initial.winnerId });
    }
  }, [initial]);

  useEffect(() => {
    const socket = getSocket();
    const onState = (state: Match) => {
      if (state.id !== matchId) return;
      setMatch((previous) => ({ ...previous, ...state } as Match));
      if (state.status === 'completed' && state.result) {
        setGameOver({ result: state.result, reason: state.resultReason || undefined, winnerId: state.winnerId });
      }
    };
    const onMove = (update: Partial<Match> & { from: string; to: string }) => {
      if (update.id && update.id !== matchId) return;
      setMatch((previous) => previous ? { ...previous, ...update } : previous);
      setLastMove({ from: update.from, to: update.to });
      setSocketError('');
    };
    const onOver = (result: MatchOver) => {
      setGameOver(result);
      setResigning(false);
      setMatch((previous) => previous ? {
        ...previous,
        status: 'completed',
        result: result.result,
        resultReason: result.reason || previous.resultReason,
        winnerId: result.winnerId ?? previous.winnerId,
        pgn: result.pgn || previous.pgn,
        finishedAt: new Date().toISOString(),
      } : previous);
    };
    const onError = (payload: { message?: string }) => {
      setSocketError(payload.message || 'The action could not be completed.');
      setResigning(false);
    };

    // Register handlers before joining so the initial match state cannot be missed.
    socket.on('match:state', onState);
    socket.on('match:move', onMove);
    socket.on('match:over', onOver);
    socket.on('match:error', onError);
    socket.emit('match:join', { matchId });

    return () => {
      socket.off('match:state', onState);
      socket.off('match:move', onMove);
      socket.off('match:over', onOver);
      socket.off('match:error', onError);
    };
  }, [matchId]);

  const isWhite = Boolean(me?.id && match?.whitePlayerId === me.id);
  const isBlack = Boolean(me?.id && match?.blackPlayerId === me.id);
  const myTurn = Boolean(match && ((match.turn === 'w' && isWhite) || (match.turn === 'b' && isBlack)));
  const finished = match?.status === 'completed' || Boolean(gameOver);
  const orientation = isBlack ? 'black' : 'white';
  const displayedResult = useMemo(() => gameOver || (match?.result ? {
    result: match.result,
    reason: match.resultReason || undefined,
    winnerId: match.winnerId,
  } : null), [gameOver, match?.result, match?.resultReason, match?.winnerId]);

  const topColor: 'White' | 'Black' = isWhite ? 'Black' : 'White';
  const topPlayer = topColor === 'White' ? match?.whitePlayer : match?.blackPlayer;
  const bottomPlayer = topColor === 'White' ? match?.blackPlayer : match?.whitePlayer;
  const topTime = topColor === 'White' ? match?.whiteTimeMs : match?.blackTimeMs;
  const bottomTime = topColor === 'White' ? match?.blackTimeMs : match?.whiteTimeMs;
  const topActive = topColor === 'White' ? match?.turn === 'w' : match?.turn === 'b';
  const bottomActive = topColor === 'White' ? match?.turn === 'b' : match?.turn === 'w';
  const topIsYou = topColor === 'White' ? isWhite : isBlack;
  const bottomIsYou = !topIsYou;
  const moveRows = useMemo(() => {
    const moves = match?.moves || [];
    return Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
      number: index + 1,
      white: moves[index * 2],
      black: moves[index * 2 + 1],
    }));
  }, [match?.moves]);

  const handleMove = (from: string, to: string) => {
    if (!match || !myTurn || finished) return;
    getSocket().emit('match:move', { matchId, from, to, promotion: 'q' });
  };

  const resign = () => {
    if (!match || finished || resigning) return;
    if (!window.confirm('Resign this game? Your opponent will win.')) return;
    setResigning(true);
    setSocketError('');
    getSocket().emit('match:resign', { matchId });
  };

  if (isLoading || !match) {
    return (
      <div className="match-loading">
        <div className="loading-chess-piece">♞</div>
        <p>{isError ? (error as Error)?.message || 'Could not load this match.' : 'Reconnecting to your game…'}</p>
        {isError && <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['match', matchId] })}>Try again</Button>}
      </div>
    );
  }

  const handleReturn = () => router.push(`/student/tournaments/${match.tournamentId}`);

  return (
    <div className="match-page">
      <header className="match-heading">
        <div className="min-w-0">
          <button type="button" onClick={handleReturn} className="match-breadcrumb">
            ← {match.tournament?.name || 'Tournament'}
          </button>
          <h1>{finished ? 'Game complete' : 'Live match'}</h1>
          <p className="match-subtitle">Started {new Date(match.createdAt).toLocaleString()}</p>
        </div>
        <div className={`match-status ${finished ? 'match-status-finished' : 'match-status-live'}`}>
          <span className="status-dot" />
          {finished ? 'Game finished' : myTurn ? 'Your turn' : 'Opponent’s turn'}
        </div>
      </header>

      <div className="match-layout">
        <section className="board-column" aria-label="Chess game">
          <div className="board-frame">
            <PlayerPanel
              player={topPlayer}
              color={topColor}
              isYou={topIsYou}
              timeMs={topTime ?? 0}
              lastMoveAt={match.lastMoveAt}
              active={Boolean(topActive)}
              finished={Boolean(finished)}
            />
            <div className="board-stage">
              <ChessBoardLive
                fen={match.fen}
                orientation={orientation}
                onMove={handleMove}
                disabled={!myTurn || Boolean(finished)}
                lastMove={lastMove}
              />
              {displayedResult && (
                <GameResultOverlay
                  result={displayedResult}
                  reason={displayedResult.reason || match.resultReason || undefined}
                  winnerId={displayedResult.winnerId ?? match.winnerId}
                  currentUserId={me?.id}
                  onReturn={handleReturn}
                />
              )}
            </div>
            <PlayerPanel
              player={bottomPlayer}
              color={topColor === 'White' ? 'Black' : 'White'}
              isYou={bottomIsYou}
              timeMs={bottomTime ?? 0}
              lastMoveAt={match.lastMoveAt}
              active={Boolean(bottomActive)}
              finished={Boolean(finished)}
            />
          </div>
          {socketError && <div className="match-error" role="alert">{socketError}</div>}
          <div className="match-actions">
            <p>{finished ? 'This game is complete.' : myTurn ? 'Make your move on the board.' : 'Waiting for your opponent to move.'}</p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={resign} disabled={Boolean(finished) || resigning}>
                {resigning ? 'Resigning…' : 'Resign'}
              </Button>
              <Button variant="outline" onClick={() => { setSocketError(''); getSocket().connect(); getSocket().emit('match:join', { matchId }); queryClient.invalidateQueries({ queryKey: ['match', matchId] }); }}>Reconnect</Button>
            </div>
          </div>
        </section>

        <aside className="match-sidebar">
          <section className="match-card tournament-card">
            <div className="match-card-heading"><span className="card-icon">♜</span><div><p>TOURNAMENT</p><h2>{match.tournament?.name || 'Tournament match'}</h2></div></div>
            <div className="tournament-facts">
              <div><span>Time control</span><strong>{formatTimeControl(match.tournament?.timeControlInitial, match.tournament?.timeControlIncrement)}</strong></div>
              <div><span>Started</span><strong>{new Date(match.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
            </div>
          </section>

          <section className="match-card moves-card">
            <div className="match-card-title"><div><p>GAME RECORD</p><h2>Moves</h2></div><span className="move-count">{match.moves?.length || 0} plies</span></div>
            {moveRows.length ? (
              <div className="move-list" aria-label="Move list">
                {moveRows.map((row) => (
                  <div className="move-row" key={row.number}>
                    <span className="move-number">{row.number}.</span>
                    <span className={row.white && lastMove?.from === row.white.from && lastMove?.to === row.white.to ? 'move-san move-san-last' : 'move-san'}>{row.white?.san || '—'}</span>
                    <span className={row.black && lastMove?.from === row.black.from && lastMove?.to === row.black.to ? 'move-san move-san-last' : 'move-san'}>{row.black?.san || ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="move-empty"><span>♙</span><p>The first move is yours to make.</p></div>
            )}
            <details className="pgn-details">
              <summary>View PGN notation</summary>
              <pre>{match.pgn || 'No moves recorded yet.'}</pre>
            </details>
          </section>

          <section className="match-card turn-card">
            <div className="match-card-title"><div><p>ON THE BOARD</p><h2>{finished ? 'Final result' : 'Game status'}</h2></div></div>
            <div className="turn-summary">
              <span className={`turn-piece ${match.turn === 'w' ? 'turn-piece-white' : 'turn-piece-black'}`} aria-hidden="true">♟</span>
              <div><strong>{finished ? titleCase(match.result) : `${titleCase(match.turn === 'w' ? 'white' : 'black')} to move`}</strong><span>{finished ? titleCase(match.resultReason) : `${match.moves?.length || 0} moves played`}</span></div>
            </div>
            {finished && match.winnerId && <p className="winner-note">Winner: {match.winnerId === match.whitePlayerId ? match.whitePlayer?.name : match.blackPlayer?.name}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
