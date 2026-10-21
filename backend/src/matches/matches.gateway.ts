import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MatchesService } from './matches.service';
import { Inject, forwardRef } from '@nestjs/common';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }, namespace: '/' })
export class MatchesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private jwt: JwtService, private matchesService: MatchesService, @Inject(forwardRef(()=>MatchmakingService)) private matchmaking: MatchmakingService) {}

  async handleConnection(client: Socket) {
    try {
      const rawCookie = client.handshake.headers.cookie || '';
      // simple cookie parse without external lib
      const cookies: any = {};
      rawCookie.split(';').forEach(c=>{
        const [k,v] = c.trim().split('=');
        if(k) cookies[k]=decodeURIComponent(v||'');
      });
      const token = cookies['access_token'] || (client.handshake.auth && client.handshake.auth.token);
      if (!token) { client.disconnect(); return; }
      const payload = await this.jwt.verifyAsync(token);
      (client as any).user = payload;
    } catch { client.disconnect(); }
  }

  @SubscribeMessage('match:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { matchId: string }) {
    const user = (client as any).user;
    const match = await this.matchesService.findOne(data.matchId);
    client.join(`match:${data.matchId}`);
    client.emit('match:state', match);
  }

  @SubscribeMessage('match:move')
  async onMove(@ConnectedSocket() client: Socket, @MessageBody() data: { matchId: string, from: string, to: string, promotion?: string }) {
    const user = (client as any).user;
    try {
      const updated = await this.matchesService.makeMove(data.matchId, user.sub, data.from, data.to, data.promotion);
      this.server.to(`match:${data.matchId}`).emit('match:move', { from: data.from, to: data.to, fen: updated.fen, pgn: updated.pgn, turn: updated.turn, whiteTimeMs: updated.whiteTimeMs, blackTimeMs: updated.blackTimeMs, lastMoveAt: updated.lastMoveAt, moves: updated.moves });
      if (updated.status === 'completed') {
        this.server.to(`match:${data.matchId}`).emit('match:over', { result: updated.result, reason: updated.resultReason, winnerId: updated.winnerId, pgn: updated.pgn });
      }
    } catch (e:any) {
      client.emit('match:error', { message: e.message });
    }
  }

  @SubscribeMessage('match:resign')
  async onResign(@ConnectedSocket() client: Socket, @MessageBody() data: { matchId: string }) {
    const user = (client as any).user;
    try {
      const updated = await this.matchesService.resign(data.matchId, user.sub);
      this.server.to(`match:${data.matchId}`).emit('match:over', { result: updated.result, reason: 'resignation', winnerId: updated.winnerId });
    } catch (e:any) { client.emit('match:error', { message: e.message }); }
  }

  @SubscribeMessage('queue:join')
  async onQueueJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { tournamentId: string }) {
    const user = (client as any).user;
    try {
      const res: any = await this.matchmaking.addToQueue(data.tournamentId, user.sub);
      if (res.paired) {
        const match = res.match;
        client.emit('queue:paired', { matchId: match.id, tournamentId: data.tournamentId });
        this.server.emit('tournament:paired', { tournamentId: data.tournamentId, matchId: match.id, whitePlayerId: match.whitePlayerId, blackPlayerId: match.blackPlayerId });
      } else {
        client.emit('queue:joined', { tournamentId: data.tournamentId, position: res.position });
      }
    } catch (e:any) { client.emit('queue:error', { message: e.message }); }
  }

  @SubscribeMessage('queue:leave')
  async onQueueLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { tournamentId: string }) {
    const user = (client as any).user;
    this.matchmaking.leaveQueue(data.tournamentId, user.sub);
    client.emit('queue:left', { tournamentId: data.tournamentId });
  }
}
