const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API = `${BASE}/api/v1`;

export class ApiError extends Error { status: number; constructor(msg:string, status:number){ super(msg); this.status=status; } }

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) } });
  const json = await res.json().catch(()=>({ success:false, message:'Invalid JSON' }));
  if (!res.ok || json.success===false) throw new ApiError(json.message || 'Request failed', res.status);
  return json.data;
}

export const api = {
  get: (p:string)=>request(p),
  post: (p:string, body:any)=>request(p,{method:'POST', body: JSON.stringify(body)}),
  patch: (p:string, body:any)=>request(p,{method:'PATCH', body: JSON.stringify(body)}),
  del: (p:string)=>request(p,{method:'DELETE'}),
};

export type User = { id: string; email: string; role: 'coach' | 'student'; name: string };
export type Tournament = { id:string, name:string, timeControlInitial:number, timeControlIncrement:number, startDate:string, status:string, createdById:string };
export type MatchSummary = { id:string, tournamentId:string, whitePlayerId:string, blackPlayerId:string, status:string, result:string|null, winnerId:string|null, pgn:string, fen:string, whiteTimeMs:number, blackTimeMs:number, turn:string, createdAt:string, finishedAt:string|null };
