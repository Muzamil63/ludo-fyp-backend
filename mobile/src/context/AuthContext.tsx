// Who is logged in. Keeps the JWT + player, connects the live socket after login, and restores the
// session when the app opens again.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { authApi } from '../api/endpoints';
import { setAuthToken, setServerUrl as setApiServerUrl, getServerUrl } from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { storage } from '../storage';
import { DEFAULT_SERVER_URL } from '../config';
import type { Player } from '../types';

interface AuthValue {
  player: Player | null;
  isGuest: boolean;
  socket: Socket | null;
  socketConnected: boolean;
  booting: boolean;
  serverUrl: string;
  playAsGuest: (displayName?: string) => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  register: (body: { username: string; email: string; password: string; display_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  changeServerUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [booting, setBooting] = useState(true);
  const [serverUrl, setServerUrlState] = useState(DEFAULT_SERVER_URL);

  // Save the token, remember the player and open the live connection.
  const startSession = useCallback(async (token: string, me: Player) => {
    setAuthToken(token);
    await storage.setToken(token);
    setPlayer(me);
    const s = connectSocket(getServerUrl(), token);
    s.on('connect', () => setSocketConnected(true));
    s.on('disconnect', () => setSocketConnected(false));
    setSocket(s);
  }, []);

  // On app start: load the saved server address and token, and check the token is still valid.
  useEffect(() => {
    (async () => {
      const savedUrl = await storage.getServerUrl();
      const url = savedUrl || DEFAULT_SERVER_URL;
      setApiServerUrl(url);
      setServerUrlState(url);

      const token = await storage.getToken();
      if (token) {
        setAuthToken(token);
        try {
          const me = await authApi.me();
          await startSession(token, me);
        } catch {
          setAuthToken(null); // expired token or server unreachable: show the welcome screen
        }
      }
      setBooting(false);
    })();
  }, [startSession]);

  const playAsGuest = useCallback(async (displayName?: string) => {
    const deviceId = await storage.getDeviceId();
    const res = await authApi.guest(deviceId, displayName || undefined);
    await startSession(res.token, res.player);
  }, [startSession]);

  const login = useCallback(async (loginName: string, password: string) => {
    const res = await authApi.login(loginName, password);
    setAuthToken(res.token);
    await startSession(res.token, await authApi.me());
  }, [startSession]);

  const register = useCallback(async (body: { username: string; email: string; password: string; display_name?: string }) => {
    const res = await authApi.register(body);
    setAuthToken(res.token);
    await startSession(res.token, await authApi.me());
  }, [startSession]);

  const logout = useCallback(async () => {
    disconnectSocket();
    setSocket(null);
    setSocketConnected(false);
    setAuthToken(null);
    await storage.clearToken();
    setPlayer(null);
  }, []);

  const refreshMe = useCallback(async () => {
    setPlayer(await authApi.me());
  }, []);

  const changeServerUrl = useCallback(async (url: string) => {
    const clean = url.trim().replace(/\/+$/, '');
    setApiServerUrl(clean);
    setServerUrlState(clean);
    await storage.setServerUrl(clean);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      player,
      isGuest: player?.player_type === 'guest',
      socket,
      socketConnected,
      booting,
      serverUrl,
      playAsGuest,
      login,
      register,
      logout,
      refreshMe,
      changeServerUrl,
    }),
    [player, socket, socketConnected, booting, serverUrl, playAsGuest, login, register, logout, refreshMe, changeServerUrl]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
