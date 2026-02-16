import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: (cb) => {
        // Send session info on every connection/reconnection so the server
        // can immediately associate this socket with the correct player
        const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('sessionToken') : null;
        const roomCode = typeof window !== 'undefined' ? sessionStorage.getItem('roomCode') : null;
        cb({ sessionToken, roomCode });
      },
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
