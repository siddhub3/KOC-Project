'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Leaderboard } from '@/components/Leaderboard';

export default function CoachDetail() {
  const { id } = useParams() as { id: string };
  const { data: tournament, isLoading, isError, refetch } = useQuery({ queryKey: ['tournament', id], queryFn: () => api.get(`/tournaments/${id}`) });
  const { data: participants } = useQuery({ queryKey: ['participants', id], queryFn: () => api.get(`/tournaments/${id}/participants`) });
  const { data: matches } = useQuery({ queryKey: ['matches', id], queryFn: () => api.get(`/tournaments/${id}/matches`), refetchInterval: 5000 });
  const { data: leaderboard } = useQuery({ queryKey: ['leaderboard', id], queryFn: () => api.get(`/tournaments/${id}/leaderboard`), refetchInterval: 5000 });

  if (isLoading) return <div className="page-loading"><span className="loading-chess-piece">♞</span><p>Loading tournament control room…</p></div>;
  if (isError || !tournament) return <div className="data-error page-data-error" role="alert"><div><strong>Couldn’t load tournament</strong><p>Check your connection and try again.</p></div><Button variant="outline" onClick={() => refetch()}>Try again</Button><Link href="/coach/tournaments" className="detail-back-link">Back to tournaments</Link></div>;

  const liveMatches = (matches || []).filter((match: any) => match.status === 'ongoing').length;

  return (
    <div className="academy-page">
      <Link href="/coach/tournaments" className="detail-back-link">← Tournament control room</Link>
      <section className="coach-detail-hero">
        <div><span className={`status-badge status-${tournament.status}`}>{tournament.status === 'ongoing' ? 'In progress' : tournament.status}</span><p className="page-eyebrow">TOURNAMENT CONTROL ROOM</p><h1>{tournament.name}</h1><p>See who joined, follow live games, and watch the standings update.</p></div>
        <div className="coach-detail-hero-mark" aria-hidden="true">♚<i>♟</i></div>
      </section>

      <div className="coach-overview-stats">
        <div><span className="overview-stat-icon">♟</span><strong>{participants?.length ?? 0}</strong><small>Players joined</small></div>
        <div><span className="overview-stat-icon overview-live-icon">●</span><strong>{liveMatches}</strong><small>Games live</small></div>
        <div><span className="overview-stat-icon overview-time-icon">◷</span><strong>{Math.floor(tournament.timeControlInitial / 60)}+{tournament.timeControlIncrement}</strong><small>Minutes + increment</small></div>
        <div><span className="overview-stat-icon overview-date-icon">▦</span><strong>{new Date(tournament.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</strong><small>{new Date(tournament.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>
      </div>

      <div className="coach-detail-grid">
        <div className="coach-detail-main">
          <section className="detail-content-card">
            <div className="detail-card-heading"><div><p className="section-eyebrow">LIVE &amp; COMPLETED GAMES</p><h2>Matches</h2></div><span className="section-count">{matches?.length || 0} total</span></div>
            {matches?.length ? <div className="detail-match-list">{matches.map((match: any) => <article className="coach-match-row" key={match.id}>
              <span className={`coach-match-icon ${match.status === 'ongoing' ? 'coach-match-icon-live' : ''}`}>{match.status === 'ongoing' ? '●' : '♟'}</span>
              <div className="coach-match-main"><div className="coach-match-players"><strong>{match.whitePlayer?.name || 'White'}</strong><span>vs</span><strong>{match.blackPlayer?.name || 'Black'}</strong></div><small>Started {new Date(match.createdAt).toLocaleString()}</small>{match.result && <small className="coach-match-result">{match.result.replace('_', ' ')} · {match.resultReason?.replaceAll('_', ' ')}</small>}</div>
              <span className={`status-badge status-${match.status}`}>{match.status === 'ongoing' ? 'Live' : match.status}</span>
            </article>)}</div> : <div className="detail-empty"><span>♟</span><strong>No matches yet</strong><p>When two students find an opponent, their game will appear here.</p></div>}
          </section>

          <section className="detail-content-card participant-card">
            <div className="detail-card-heading"><div><p className="section-eyebrow">THE PLAYERS</p><h2>Participants</h2></div><span className="section-count">{participants?.length || 0} joined</span></div>
            {participants?.length ? <div className="participant-list">{participants.map((participant: any, index: number) => <div className="participant-row" key={participant.id}><span className="participant-number">{String(index + 1).padStart(2, '0')}</span><span className="participant-avatar">{participant.name?.slice(0, 1).toUpperCase()}</span><span className="participant-name">{participant.name}</span><span className="participant-role">Student</span></div>)}</div> : <div className="detail-empty detail-empty-small"><strong>Waiting for players</strong><p>Share the open tournament with your students.</p></div>}
          </section>
        </div>

        <section className="detail-content-card coach-leaderboard-card">
          <div className="detail-card-heading"><div><p className="section-eyebrow">RANKINGS</p><h2>Leaderboard</h2></div><span className="leaderboard-trophy">♛</span></div>
          <Leaderboard data={leaderboard?.leaderboard || []} />
          <p className="leaderboard-note">Win 1 point · Draw ½ point · Loss 0 points</p>
        </section>
      </div>
    </div>
  );
}
