'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Tournament } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

type TournamentCard = Tournament & { createdAt?: string };

function timeControl(initial: number, increment: number) {
  return `${Math.floor(initial / 60)}+${increment}`;
}

export default function StudentBrowse() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery<TournamentCard[]>({
    queryKey: ['tournaments'],
    queryFn: () => api.get('/tournaments'),
  });
  const joinMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tournaments/${id}/join`, {}),
    onSuccess: async (_result, id) => {
      await queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      await queryClient.invalidateQueries({ queryKey: ['participants', id] });
      router.push(`/student/tournaments/${id}`);
    },
  });

  const tournaments = data || [];
  const openCount = tournaments.filter((tournament) => tournament.status === 'open').length;
  const liveCount = tournaments.filter((tournament) => tournament.status === 'ongoing').length;

  return (
    <div className="academy-page">
      <section className="student-welcome">
        <div className="student-welcome-copy">
          <span className="welcome-kicker">YOUR NEXT GAME STARTS HERE</span>
          <h1>Ready to make<br /><span>your next move{me?.name ? `, ${me.name.split(' ')[0]}` : ''}?</span></h1>
          <p>Join a tournament, find an opponent, and put your chess skills to work.</p>
          <a href="#tournament-list" className="welcome-cta">Explore tournaments <span aria-hidden="true">↓</span></a>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-board"><span>♜</span><i /><span>♞</span><i /><i /><span>♟</span><i /><span>♟</span><span>♙</span><i /><span>♙</span><i /><i /><span>♘</span><i /><span>♖</span></div>
          <span className="welcome-piece">♘</span>
          <span className="welcome-spark welcome-spark-one">✦</span><span className="welcome-spark welcome-spark-two">✧</span>
        </div>
        <div className="welcome-orbit welcome-orbit-one" /><div className="welcome-orbit welcome-orbit-two" />
      </section>

      <div className="student-stat-row">
        <div className="student-stat"><span className="stat-icon stat-icon-orange">♟</span><div><strong>{isLoading ? '—' : tournaments.length}</strong><small>Available tournaments</small></div></div>
        <div className="student-stat"><span className="stat-icon stat-icon-green">●</span><div><strong>{isLoading ? '—' : openCount}</strong><small>Open to join</small></div></div>
        <div className="student-stat"><span className="stat-icon stat-icon-blue">♜</span><div><strong>{isLoading ? '—' : liveCount}</strong><small>In progress</small></div></div>
      </div>

      <section id="tournament-list" className="tournament-section">
        <div className="section-heading-row">
          <div><p className="page-eyebrow">FIND YOUR COMPETITION</p><h2 className="section-title">Tournaments</h2><p className="section-description">Join an open tournament to meet your next opponent.</p></div>
          <span className="section-count">{tournaments.length} {tournaments.length === 1 ? 'tournament' : 'tournaments'}</span>
        </div>

        {joinMutation.isError && <div className="inline-feedback" role="alert">{(joinMutation.error as Error).message || 'Could not join this tournament. Please try again.'}</div>}
        {isError && <div className="data-error" role="alert"><span className="data-error-icon">!</span><div><strong>We couldn’t load tournaments</strong><p>{(error as Error)?.message || 'Check your connection and try again.'}</p></div><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>}

        {isLoading ? <div className="tournament-grid">{[1,2,3].map((item) => <div className="tournament-skeleton" key={item}><i /><i /><i /><i /></div>)}</div>
          : !isError && tournaments.length === 0 ? <div className="academy-empty"><span>♟</span><h3>No tournaments just yet</h3><p>Your coach hasn’t opened a tournament. Check back soon and get ready to play.</p></div>
          : <div className="tournament-grid">{tournaments.map((tournament, index) => <article className="tournament-tile" key={tournament.id} style={{ animationDelay: `${index * 65}ms` }}>
            <div className="tile-art"><div className="tile-board" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><span>♞</span></div><span className={`tournament-status-pill tournament-status-${tournament.status}`}><i />{tournament.status === 'ongoing' ? 'Live now' : 'Open'}</span></div>
            <div className="tile-content">
              <div className="tile-meta"><span>♟ &nbsp;TOURNAMENT</span><span className="tile-time-control">{timeControl(tournament.timeControlInitial, tournament.timeControlIncrement)}</span></div>
              <h3>{tournament.name}</h3>
              <p className="tile-date"><span aria-hidden="true">◷</span> Starts {new Date(tournament.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              <div className="tile-footer">
                <Button onClick={() => joinMutation.mutate(tournament.id)} disabled={(joinMutation.isPending && joinMutation.variables === tournament.id) || tournament.status !== 'open'} variant="secondary">
                  {joinMutation.isPending && joinMutation.variables === tournament.id ? <><span className="button-spinner" /> Joining…</> : tournament.status === 'open' ? 'Join tournament' : 'Registration closed'}
                </Button>
                <Link href={`/student/tournaments/${tournament.id}`} aria-label={`View ${tournament.name}`}>View details <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </article>)}</div>}
      </section>
    </div>
  );
}
