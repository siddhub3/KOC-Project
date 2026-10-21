'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaderboard } from '@/components/Leaderboard';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { useEffect, useState } from 'react';

export default function StudentTournamentDetail() {
  const { id } = useParams() as { id:string };
  const router=useRouter();
  const qc=useQueryClient();
  const { data: me } = useAuth();
  const { data: tour } = useQuery({ queryKey:['tournament',id], queryFn:()=>api.get(`/tournaments/${id}`) });
  const { data: lb } = useQuery({ queryKey:['leaderboard',id], queryFn:()=>api.get(`/tournaments/${id}/leaderboard`), refetchInterval: 3000 });
  const { data: matches } = useQuery({ queryKey:['matches',id], queryFn:()=>api.get(`/tournaments/${id}/matches`), refetchInterval: 3000 });
  const [queueStatus,setQueueStatus]=useState<string>('');

  useEffect(()=>{
    const s=getSocket();
    s.on('queue:joined', (d:any)=>{ if(d.tournamentId===id) setQueueStatus(`Queued – position ${d.position}. Waiting for opponent...`); });
    s.on('queue:paired', (d:any)=>{ if(d.tournamentId===id) { setQueueStatus('Paired! Redirecting...'); router.push(`/play/${d.matchId}`); } });
    s.on('tournament:paired', (d:any)=>{ if(d.tournamentId===id && (d.whitePlayerId===me?.id || d.blackPlayerId===me?.id)) { router.push(`/play/${d.matchId}`); } });
    s.on('queue:error', (d:any)=> setQueueStatus(`Error: ${d.message}`));
    return ()=>{ s.off('queue:joined'); s.off('queue:paired'); s.off('tournament:paired'); s.off('queue:error'); };
  },[id, me]);

  const joinMut = useMutation({ mutationFn:()=>api.post(`/tournaments/${id}/join`,{}), onSuccess:()=>qc.invalidateQueries() });
  const findMut = useMutation({ mutationFn: async()=>{ const s=getSocket(); s.emit('queue:join',{ tournamentId: id }); setQueueStatus('Joining queue...'); }, });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{tour?.name || 'Tournament'}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Play</CardTitle></CardHeader><CardContent className="space-y-3">
          <Button variant="outline" onClick={()=>joinMut.mutate()} disabled={joinMut.isPending}>{joinMut.isPending?'Joining...':'Join Tournament'}</Button>
          <Button onClick={()=>findMut.mutate()} className="w-full text-lg py-6" variant="secondary">🔍 Find Opponent</Button>
          {queueStatus && <div className="text-sm p-2 bg-orange-50 border rounded">{queueStatus}</div>}
          <div className="text-xs text-gray-500">Flow: Join → Find opponent → Server auto-pairs two waiting players → Both pushed to live game via Socket.IO – no refresh needed.</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader><CardContent><Leaderboard data={lb?.leaderboard||[]} currentUserId={me?.id} /></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>My Match History (this tournament)</CardTitle></CardHeader><CardContent className="text-sm space-y-1">{matches?.filter((m:any)=>m.whitePlayerId===me?.id || m.blackPlayerId===me?.id).map((m:any)=><div key={m.id} className="flex justify-between border-b py-1"><span onClick={()=>router.push(`/play/${m.id}`)} className="cursor-pointer underline">{m.id.slice(0,8)} – {m.status} {m.result? `(${m.result})`:''}</span><span>{new Date(m.createdAt).toLocaleTimeString()}</span></div>) || 'No matches yet'}</CardContent></Card>
    </div>
  );
}
