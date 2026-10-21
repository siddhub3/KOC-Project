'use client';
export function Leaderboard({ data, currentUserId }: { data: any[], currentUserId?: string }) {
  if (!data || data.length===0) return <div className="text-sm text-gray-500 p-4">No participants yet.</div>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-2">Rank</th><th>Player</th><th>Pts</th><th>W-D-L</th></tr></thead>
      <tbody>{data.map((r:any)=><tr key={r.id} className={`border-b ${currentUserId===r.id ? 'bg-orange-50 font-semibold' : ''}`}><td className="py-2">#{r.rank} {r.rank===1?'👑':''}</td><td>{r.name}</td><td>{r.points}</td><td>{r.wins}-{r.draws}-{r.losses}</td></tr>)}</tbody>
    </table>
  );
}
