'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaderboard } from '@/components/Leaderboard';

export default function CoachDetail() {
  const { id } = useParams() as { id:string };
  const { data: tour } = useQuery({ queryKey:['tournament',id], queryFn:()=>api.get(`/tournaments/${id}`) });
  const { data: participants } = useQuery({ queryKey:['participants',id], queryFn:()=>api.get(`/tournaments/${id}/participants`) });
  const { data: matches } = useQuery({ queryKey:['matches',id], queryFn:()=>api.get(`/tournaments/${id}/matches`) });
  const { data: lb } = useQuery({ queryKey:['leaderboard',id], queryFn:()=>api.get(`/tournaments/${id}/leaderboard`) });

  if (!tour) return <div>Loading...</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{tour.name} – Stats</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><div>Status: {tour.status}</div><div>Time: {tour.timeControlInitial/60}+{tour.timeControlIncrement}</div><div>Start: {new Date(tour.startDate).toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Participants ({participants?.length||0})</CardTitle></CardHeader><CardContent className="text-sm space-y-1">{participants?.map((p:any)=><div key={p.id}>{p.name} – {p.email}</div>)} {participants?.length===0 && 'No one joined yet.'}</CardContent></Card>
        <Card><CardHeader><CardTitle>Matches ({matches?.length||0})</CardTitle></CardHeader><CardContent className="text-sm space-y-1">{matches?.map((m:any)=><div key={m.id} className="flex justify-between"><span>{m.whitePlayerId.slice(0,4)} vs {m.blackPlayerId.slice(0,4)}</span><span>{m.status} {m.result && `(${m.result})`}</span></div>)} {matches?.length===0 && 'No matches yet.'}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader><CardContent><Leaderboard data={lb?.leaderboard || []} /></CardContent></Card>
    </div>
  );
}
