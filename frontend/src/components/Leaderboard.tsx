'use client';

export function Leaderboard({ data, currentUserId }: { data: any[]; currentUserId?: string }) {
  if (!data || data.length === 0) return <div className="leaderboard-empty"><span>♛</span><strong>The standings are waiting</strong><small>Join the tournament and play a game to get on the board.</small></div>;

  return (
    <div className="leaderboard-table-wrap">
      <table className="leaderboard-table">
        <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Pts</th><th scope="col">W-D-L</th></tr></thead>
        <tbody>{data.map((player: any) => <tr key={player.id} className={currentUserId === player.id ? 'leaderboard-current-user' : ''}>
          <td><span className={`rank-badge ${player.rank <= 3 ? `rank-top-${player.rank}` : ''}`}>{player.rank === 1 ? '♛' : `#${player.rank}`}</span></td>
          <td><span className="leaderboard-player"><span className="leaderboard-avatar">{player.name?.slice(0, 1).toUpperCase()}</span><span><strong>{player.name}</strong>{currentUserId === player.id && <small>YOU</small>}</span></span></td>
          <td><strong className="leaderboard-points">{player.points}</strong></td>
          <td className="leaderboard-record">{player.wins}-{player.draws}-{player.losses}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
