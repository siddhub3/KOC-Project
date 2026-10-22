import { io, Socket } from 'socket.io-client';
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
let socket: Socket | null = null;
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(BASE, { withCredentials: true, transports: ['websocket','polling'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
