'use client';
import { useEffect, useState } from 'react';
export function formatClock(ms: number) {
  if (ms<=0) return '0:00';
  const totalSec = Math.floor(ms/1000);
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
export function Clock({ timeMs, lastMoveAt, active, label }: { timeMs: number, lastMoveAt: string, active: boolean, label: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{ if(!active) return; const id=setInterval(()=>setNow(Date.now()),200); return ()=>clearInterval(id); },[active]);
  const elapsed = active ? now - new Date(lastMoveAt).getTime() : 0;
  const remaining = Math.max(0, timeMs - elapsed);
  const low = remaining < 30000;
  return <div className={`flex justify-between items-center px-4 py-2 rounded border ${active ? 'bg-[#0f3b5f] text-white' : 'bg-white'} ${low && active ? 'animate-pulse bg-red-600' : ''}`}><span className="text-xs uppercase tracking-widest">{label}</span><span className="font-mono font-bold text-lg">{formatClock(remaining)}</span></div>;
}
