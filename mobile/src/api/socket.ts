// The live connection (Socket.IO) used for playing, matchmaking, lobbies and notifications.
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(serverUrl: string, token: string): Socket {
  disconnectSocket();
  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket'], // React Native supports WebSocket directly
    reconnection: true,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export const getSocket = () => socket;

// Sends an event and waits for the server's answer ({ success, data } / { success: false, message }).
export function emitAck<T = unknown>(event: string, data: object = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('Not connected to the game server. Please wait a moment.'));
      return;
    }
    socket.timeout(12000).emit(event, data, (err: Error | null, res: { success: boolean; data?: T; message?: string }) => {
      if (err) return reject(new Error('The server did not answer in time.'));
      if (!res || !res.success) return reject(new Error(res?.message || 'Something went wrong'));
      resolve(res.data as T);
    });
  });
}
