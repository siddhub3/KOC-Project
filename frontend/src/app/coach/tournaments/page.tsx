'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Tournament } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TournamentRow = Tournament & { createdAt?: string };
type TournamentForm = { name: string; timeControlInitial: number; timeControlIncrement: number; startDate: string; status: string };

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CoachTournaments() {
  const queryClient = useQueryClient();
  const { data: me } = useAuth();
  const { data: tournaments, isLoading, isError, error, refetch } = useQuery<TournamentRow[]>({
    queryKey: ['tournaments'],
    queryFn: () => api.get('/tournaments'),
  });
  const [form, setForm] = useState<TournamentForm>({
    name: 'Kingdom Cup',
    timeControlInitial: 300,
    timeControlIncrement: 0,
    startDate: localDateTimeValue(new Date(Date.now() + 86400000)),
    status: 'open',
  });
  const createMutation = useMutation({
    mutationFn: (body: TournamentForm & { startDate: string }) => api.post('/tournaments', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setForm((current) => ({ ...current, name: '' }));
    },
  });

  const allTournaments = tournaments || [];
  const stats = useMemo(() => ({
    total: allTournaments.length,
    live: allTournaments.filter((tournament) => tournament.status === 'ongoing').length,
    registration: allTournaments.filter((tournament) => tournament.status === 'open').length,
  }), [allTournaments]);

  const createTournament = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({ ...form, startDate: new Date(form.startDate).toISOString() });
  };

  return (
    <div className="academy-page">
      <section className="coach-welcome">
        <div><p className="welcome-kicker">COACH CONTROL ROOM</p><h1>Let’s get them<br /><span>in the game{me?.name ? `, ${me.name.split(' ')[0]}` : ''}.</span></h1><p>Create a tournament and let the students take it from there. We’ll pair players automatically.</p></div>
        <div className="coach-welcome-art" aria-hidden="true"><span>♚</span><i /><b>PAIR<br />PLAY<br />GROW</b></div>
      </section>

      <div className="coach-stat-row">
        <div className="coach-stat"><span className="coach-stat-icon">♟</span><div><strong>{isLoading ? '—' : stats.total}</strong><small>Total tournaments</small></div></div>
        <div className="coach-stat"><span className="coach-stat-icon coach-stat-live">●</span><div><strong>{isLoading ? '—' : stats.live}</strong><small>Games in progress</small></div></div>
        <div className="coach-stat"><span className="coach-stat-icon coach-stat-open">◷</span><div><strong>{isLoading ? '—' : stats.registration}</strong><small>Open for joining</small></div></div>
      </div>

      <div className="coach-dashboard-grid">
        <section className="create-panel">
          <div className="create-panel-heading"><span className="create-icon">＋</span><div><p className="section-eyebrow">SET UP A NEW EVENT</p><h2>Create tournament</h2></div></div>
          <p className="create-description">Choose a name and a clock. Students will join and the system will match them automatically.</p>
          <form className="tournament-form" onSubmit={createTournament}>
            <div className="form-field form-field-wide"><label htmlFor="tournament-name" className="field-label">Tournament name</label><Input id="tournament-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Friday Blitz Cup" minLength={2} maxLength={100} required /></div>
            <div className="form-field"><label htmlFor="time-control" className="field-label">Minutes per player</label><Input id="time-control" type="number" min={1} max={180} value={Math.floor(form.timeControlInitial / 60)} onChange={(event) => setForm({ ...form, timeControlInitial: Math.max(60, Number(event.target.value) * 60 || 60) })} required /><small className="field-hint">Five minutes is a fun quick game.</small></div>
            <div className="form-field"><label htmlFor="time-increment" className="field-label">Increment in seconds</label><Input id="time-increment" type="number" min={0} max={60} value={form.timeControlIncrement} onChange={(event) => setForm({ ...form, timeControlIncrement: Math.max(0, Number(event.target.value) || 0) })} /><small className="field-hint">Added after every move.</small></div>
            <div className="form-field"><label htmlFor="start-date" className="field-label">Start date &amp; time</label><Input id="start-date" type="datetime-local" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></div>
            <div className="form-field"><label htmlFor="tournament-status" className="field-label">Registration</label><select id="tournament-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Save as draft</option><option value="open">Open for students</option></select></div>
            {createMutation.isError && <div className="inline-feedback form-field-wide" role="alert">{(createMutation.error as Error).message || 'Could not create the tournament. Try again.'}</div>}
            {createMutation.isSuccess && <div className="inline-feedback inline-success form-field-wide" role="status">Tournament created. Students can now find it and join.</div>}
            <Button type="submit" variant="secondary" className="create-submit form-field-wide" disabled={createMutation.isPending}>{createMutation.isPending ? <><span className="button-spinner" /> Creating your tournament…</> : <>Create tournament <span aria-hidden="true">→</span></>}</Button>
          </form>
        </section>

        <section className="coach-events-panel">
          <div className="section-heading-row">
            <div><p className="page-eyebrow">YOUR CHESS COMMUNITY</p><h2 className="section-title">Tournaments</h2><p className="section-description">Keep an eye on what’s coming up and what’s being played.</p></div>
            <span className="section-count">{allTournaments.length} total</span>
          </div>
          {isError && <div className="data-error" role="alert"><div><strong>We couldn’t load tournaments</strong><p>{(error as Error)?.message || 'Check your connection and try again.'}</p></div><Button variant="outline" onClick={() => refetch()}>Retry</Button></div>}
          {isLoading ? <div className="event-skeleton-list">{[1,2,3].map((item) => <div className="event-skeleton" key={item} />)}</div>
            : !isError && allTournaments.length === 0 ? <div className="academy-empty compact-empty"><span>♜</span><h3>Your first tournament starts here</h3><p>Create an event and your students can join from their account.</p></div>
            : <div className="event-list">{allTournaments.map((tournament, index) => <article className="event-row" key={tournament.id} style={{ animationDelay: `${index * 50}ms` }}>
              <div className="event-date-block"><strong>{new Date(tournament.startDate).toLocaleDateString([], { day: '2-digit' })}</strong><span>{new Date(tournament.startDate).toLocaleDateString([], { month: 'short' })}</span></div>
              <div className="event-main"><div className="event-title-row"><h3>{tournament.name}</h3><span className={`status-badge status-${tournament.status}`}>{tournament.status === 'ongoing' ? 'Live now' : tournament.status === 'open' ? 'Open' : tournament.status}</span></div><p>{Math.floor(tournament.timeControlInitial / 60)}+{tournament.timeControlIncrement} time control <i /> {new Date(tournament.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
              <Link href={`/coach/tournaments/${tournament.id}`} className="event-link">Manage <span aria-hidden="true">→</span></Link>
            </article>)}</div>}
        </section>
      </div>
    </div>
  );
}
