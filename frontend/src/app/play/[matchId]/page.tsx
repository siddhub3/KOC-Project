'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { ChessBoardLive } from '@/components/ChessBoardLive';
import { Clock } from '@/components/Clock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function PlayPage() {
  const { matchId } = useParams() as { matchId:string };
  const { data: me } = useAuth();
  const { data: initial } = useQuery({ queryKey:['match',matchId], queryFn:()=>api.get(`/matches/${matchId}`) });
  const [match,setMatch]=useState<any>(null);
  const [error,setError]=useState('');
  const [lastMove,setLastMove]=useState<{from:string,to:string}|null>(null);
  const [gameOver,setGameOver]=useState<any>(null);

  useEffect(()=>{ if(initial) setMatch(initial); },[initial]);

  useEffect(()=>{
    const s=getSocket();
    s.emit('match:join',{ matchId });
    s.on('match:state', (m:any)=> setMatch(m));
    s.on('match:move', (m:any)=> { setMatch((prev:any)=>({ ...prev, ...m })); setLastMove({ from:m.from, to:m.to }); });
    s.on('match:over', (o:any)=> setGameOver(o));
    s.on('match:error', (e:any)=> setError(e.message));
    return ()=>{ s.off('match:state'); s.off('match:move'); s.off('match:over'); s.off('match:error'); };
  },[matchId]);

  if (!match) return <div className="p-8">Loading match... If empty, ensure you joined tournament and were paired.</div>;

  const isWhite = me?.id === match.whitePlayerId;
  const isBlack = me?.id === match.blackPlayerId;
  const myTurn = (match.turn==='w' && isWhite) || (match.turn==='b' && isBlack);
  const orientation = isBlack ? 'black' as const : 'white' as const;

  const handleMove = (from:string,to:string)=>{
    if (!myTurn || match.status!=='ongoing') return;
    const s=getSocket();
    s.emit('match:move',{ matchId, from, to, promotion:'q' });
  };

  const resign = ()=>{ const s=getSocket(); s.emit('match:resign',{ matchId }); };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center"><h1 className="font-bold text-xl">Live Match – {matchId.slice(0,8)}</h1><span className="text-xs px-2 py-1 rounded bg-gray-100">{match.status} {gameOver? `– ${gameOver.result} (${gameOver.reason})`:''}</span></div>
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <Clock timeMs={isWhite? match.blackTimeMs : match.whiteTimeMs} lastMoveAt={match.lastMoveAt} active={match.turn !== (isWhite?'w':'b') && match.status==='ongoing'} label={isWhite? 'Black (opponent)' : 'White (opponent)'} />
        <ChessBoardLive fen={match.fen} orientation={orientation} onMove={handleMove} disabled={!myTurn || match.status!=='ongoing'} lastMove={lastMove} />
        <Clock timeMs={isWhite? match.whiteTimeMs : match.blackTimeMs} lastMoveAt={match.lastMoveAt} active={myTurn && match.status==='ongoing'} label={isWhite? 'White (you)' : 'Black (you)'} />
        <div className="flex gap-2"><Button variant="destructive" onClick={resign} disabled={match.status!=='ongoing'}>Resign</Button><Button variant="outline" onClick={()=>window.location.reload()}>Refresh</Button></div>
      </div>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>PGN & Moves</CardTitle></CardHeader><CardContent><div className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-2 rounded min-h-[120px]">{match.pgn || 'Game start – no moves yet.'}</div><div className="mt-2 text-xs space-y-1 max-h-[200px] overflow-auto">{(match.moves||[]).map((m:any,i:number)=><div key={i}>{Math.floor(i/2)+1}. {m.san} ({m.from}-{m.to})</div>)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Info</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><div>Turn: {match.turn==='w'?'White':'Black'} {myTurn?'(Your turn)':''}</div><div>FEN: <span className="font-mono text-[10px] break-all">{match.fen}</span></div><div>Clock: {Math.floor(match.whiteTimeMs/1000)}s / {Math.floor(match.blackTimeMs/1000)}s</div>{gameOver && <div className="p-2 bg-green-50 border rounded mt-2"><div className="font-bold">Game Over</div><div>Result: {gameOver.result}</div><div>Reason: {gameOver.reason}</div></div>}</CardContent></Card>
      </div>
    </div>
  );
}
