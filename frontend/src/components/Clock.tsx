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
  return (
    <div className={`clock-display ${active ? 'clock-display-active' : ''} ${low && active ? 'clock-display-low' : ''}`}>
      <span className="clock-label">{active ? 'THINKING' : 'TIME'} · {label.toUpperCase()}</span>
      <span className="clock-value" aria-label={`${label} time ${formatClock(remaining)}`}>{formatClock(remaining)}</span>
    </div>
  );
}
