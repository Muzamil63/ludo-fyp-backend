// Listen to one socket event while the screen is open. The handler always sees the latest state.
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const { socket } = useAuth();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;
    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}
