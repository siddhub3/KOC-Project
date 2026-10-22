'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Leaderboard } from '@/components/Leaderboard';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';

type TournamentDetails = { id: string; name: string; timeControlInitial: number; timeControlIncrement: number; startDate: string; status: string };
type Participant = { id: string; name: string; email: string };
type TournamentMatch = { id: string; whitePlayerId: string; blackPlayerId: string; whitePlayer?: Participant; blackPlayer?: Participant; status: string; result?: string | null; createdAt: string };

export default function StudentTournamentDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useAuth();
  const { data: tournament, isLoading: tournamentLoading, isError: tournamentError, refetch: refetchTournament } = useQuery<TournamentDetails>({ queryKey: ['tournament', id], queryFn: () => api.get(`/tournaments/${id}`) });
  const { data: participants } = useQuery<Participant[]>({ queryKey: ['participants', id], queryFn: () => api.get(`/tournaments/${id}/participants`) });
  const { data: leaderboard } = useQuery({ queryKey: ['leaderboard', id], queryFn: () => api.get(`/tournaments/${id}/leaderboard`), refetchInterval: 5000 });
  const { data: matches } = useQuery<TournamentMatch[]>({ queryKey: ['matches', id], queryFn: () => api.get(`/tournaments/${id}/matches`), refetchInterval: 5000 });
  const [queueStatus, setQueueStatus] = useState('');
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const onJoined = (event: { tournamentId: string; position: number }) => {
      if (event.tournamentId !== id) return;
      setQueued(true);
      setQueueStatus(`You’re in the queue · position ${event.position}. We’ll take you to the board as soon as an opponent is ready.`);
    };
    const onPaired = (event: { tournamentId: string; matchId: string }) => {
      if (event.tournamentId !== id) return;
      setQueueStatus('Opponent found! Opening your game…');
      router.push(`/play/${event.matchId}`);
    };
    const onTournamentPaired = (event: { tournamentId: string; matchId: string; whitePlayerId: string; blackPlayerId: string }) => {
      if (event.tournamentId === id && (event.whitePlayerId === me?.id || event.blackPlayerId === me?.id)) {
        setQueueStatus('Opponent found! Opening your game…');
        router.push(`/play/${event.matchId}`);
      }
    };
    const onLeft = (event: { tournamentId: string }) => {
      if (event.tournamentId === id) { setQueued(false); setQueueStatus('Search canceled. You can join the queue again any time.'); }
    };
    const onError = (event: { tournamentId?: string; message?: string }) => {
      if (event.tournamentId !== id) return;
      setQueued(false);
      setQueueStatus(event.message || 'Could not join the queue. Try again.');
    };

    socket.on('queue:joined', onJoined);
    socket.on('queue:paired', onPaired);
    socket.on('tournament:paired', onTournamentPaired);
    socket.on('queue:left', onLeft);
    socket.on('queue:error', onError);
    return () => {
      socket.off('queue:joined', onJoined);
      socket.off('queue:paired', onPaired);
      socket.off('tournament:paired', onTournamentPaired);
      socket.off('queue:left', onLeft);
      socket.off('queue:error', onError);
    };
  }, [id, me?.id, router]);

  const isParticipant = Boolean(participants?.some((participant) => participant.id === me?.id));
  const joinMutation = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/join`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['participants', id] }),
  });
  const joinQueue = useMutation({
    mutationFn: async () => {
      setQueueStatus('Finding your next opponent…');
      getSocket().emit('queue:join', { tournamentId: id });
    },
    onError: (error) => setQueueStatus((error as Error).message || 'Could not join the queue.'),
  });

  const cancelSearch = () => getSocket().emit('queue:leave', { tournamentId: id });
  const myMatches = (matches || []).filter((match) => match.whitePlayerId === me?.id || match.blackPlayerId === me?.id);

  if (tournamentLoading) return <div className="page-loading"><span className="loading-chess-piece">♞</span><p>Setting up the tournament…</p></div>;
  if (tournamentError || !tournament) return <div className="data-error page-data-error" role="alert"><div><strong>Couldn’t open this tournament</strong><p>It may have been removed, or your connection may have dropped.</p></div><Button variant="outline" onClick={() => refetchTournament()}>Try again</Button><Link href="/student/tournaments" className="detail-back-link">Back to tournaments</Link></div>;

  return (
    <div className="academy-page">
      <Link href="/student/tournaments" className="detail-back-link">← All tournaments</Link>
      <section className="tournament-detail-hero">
        <div className="detail-hero-copy">
          <span className={`status-badge status-${tournament.status}`}>{tournament.status === 'ongoing' ? 'Games in progress' : tournament.status === 'open' ? 'Registration open' : tournament.status}</span>
          <h1>{tournament.name}</h1>
          <p>Join the field, meet a new opponent, and climb the leaderboard one game at a time.</p>
          <div className="detail-facts">
            <span><i>◷</i><strong>{Math.floor(tournament.timeControlInitial / 60)}+{tournament.timeControlIncrement}</strong><small>minutes + increment</small></span>
            <span><i>▦</i><strong>{new Date(tournament.startDate).toLocaleDateString([], { dateStyle: 'medium' })}</strong><small>{new Date(tournament.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span>
            <span><i>♟</i><strong>{participants?.length ?? '—'}</strong><small>players joined</small></span>
          </div>
        </div>
        <div className="detail-hero-art" aria-hidden="true"><span>♞</span><i>YOUR<br />NEXT<br />GAME</i><b>✦</b></div>
      </section>

      <div className="detail-dashboard-grid">
        <div className="detail-main-column">
          <section className="play-cta-card">
            <div className="play-cta-copy"><span className="cta-icon">♟</span><div><p className="section-eyebrow">READY WHEN YOU ARE</p><h2>Find your next opponent</h2><p>We’ll pair you with another student and open the live board automatically.</p></div></div>
            {!isParticipant ? <Button variant="secondary" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending || tournament.status !== 'open'}>{joinMutation.isPending ? 'Joining…' : tournament.status === 'open' ? 'Join tournament' : 'Registration closed'}</Button>
              : queued ? <Button variant="outline" onClick={cancelSearch}>Cancel search</Button>
              : <Button variant="secondary" onClick={() => { setQueued(true); joinQueue.mutate(); }} disabled={queued || joinQueue.isPending || tournament.status === 'completed'}>{joinQueue.isPending ? 'Searching…' : 'Find opponent →'}</Button>}
          </section>
          {joinMutation.isError && <div className="inline-feedback" role="alert">{(joinMutation.error as Error).message || 'Could not join this tournament.'}</div>}
          {queueStatus && <div className={`queue-status-message ${queued ? 'queue-status-active' : ''}`} role="status"><span className="queue-status-icon">{queued ? '◌' : '♟'}</span><span>{queueStatus}</span>{queued && <span className="queue-searching"><i /><i /><i /></span>}</div>}
          {joinQueue.isError && !queueStatus && <div className="inline-feedback" role="alert">{(joinQueue.error as Error).message}</div>}

          <section className="detail-content-card">
            <div className="detail-card-heading"><div><p className="section-eyebrow">YOUR RECENT GAMES</p><h2>Match history</h2></div><span className="section-count">{myMatches.length} games</span></div>
            {myMatches.length ? <div className="detail-match-list">{myMatches.map((match) => {
              const isWhite = match.whitePlayerId === me?.id;
              const opponent = isWhite ? match.blackPlayer : match.whitePlayer;
              return <button type="button" key={match.id} className="detail-match-row" onClick={() => router.push(`/play/${match.id}`)}>
                <span className={`match-list-avatar ${match.status === 'ongoing' ? 'match-list-avatar-live' : ''}`}>{match.status === 'ongoing' ? '●' : '♟'}</span>
                <span className="detail-match-main"><strong>vs {opponent?.name || 'Opponent'}</strong><small>You played {isWhite ? 'White' : 'Black'} · {new Date(match.createdAt).toLocaleString()}</small></span>
                <span className={`detail-match-result ${match.status === 'ongoing' ? 'detail-result-live' : ''}`}>{match.status === 'ongoing' ? 'LIVE' : match.result ? match.result.replace('_', ' ') : 'FINISHED'}</span>
                <span className="detail-match-arrow">→</span>
              </button>;
            })}</div> : <div className="detail-empty"><span>♘</span><strong>Your first game is waiting</strong><p>Find an opponent and your matches will show up here.</p></div>}
          </section>
        </div>

        <section className="detail-content-card leaderboard-card">
          <div className="detail-card-heading"><div><p className="section-eyebrow">TOURNAMENT STANDINGS</p><h2>Leaderboard</h2></div><span className="leaderboard-trophy">♛</span></div>
          <Leaderboard data={leaderboard?.leaderboard || []} currentUserId={me?.id} />
          <p className="leaderboard-note">Win 1 point · Draw ½ point · Loss 0 points</p>
        </section>
      </div>
    </div>
  );
}
