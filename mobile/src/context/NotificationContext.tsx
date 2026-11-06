// In-app notifications: a toast that slides down from the top.
// Listens to the server's personal events (invitations, tournament match ready / started / finished)
// and lets any screen show a quick success / error message with showToast().
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthContext';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { navigate } from '../navigation/navigationRef';
import { roomApi, tournamentApi } from '../api/endpoints';
import { colors, radius } from '../theme';
import { formatTime } from '../utils/format';

type ToastKind = 'success' | 'error' | 'info' | 'invite' | 'trophy';
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationValue {
  showToast: (kind: ToastKind, title: string, message?: string) => void;
  inviteCount: number;
  refreshInviteCount: () => Promise<void>;
  setActiveMatch: (matchId: number | null) => void; // the game screen tells us which match is open
}

const NotificationContext = createContext<NotificationValue | null>(null);

const ICONS: Record<ToastKind, string> = { success: '✅', error: '⚠️', info: '🎲', invite: '✉️', trophy: '🏆' };

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { player, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const activeMatch = useRef<number | null>(null);
  const slide = useRef(new Animated.Value(-160)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(slide, { toValue: -160, duration: 220, useNativeDriver: true }).start(() => setToast(null));
  }, [slide]);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ ...t, id: Date.now() });
    slide.setValue(-160);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    hideTimer.current = setTimeout(hide, t.onAction ? 7000 : 3500);
  }, [slide, hide]);

  const showToast = useCallback((kind: ToastKind, title: string, message?: string) => show({ kind, title, message }), [show]);

  const refreshInviteCount = useCallback(async () => {
    if (!player || isGuest) return setInviteCount(0);
    try {
      const [rooms, tournaments] = await Promise.all([roomApi.invitations(), tournamentApi.invitations()]);
      setInviteCount(rooms.length + tournaments.length);
    } catch {
      // not important enough to show an error
    }
  }, [player, isGuest]);

  useEffect(() => {
    refreshInviteCount();
  }, [refreshInviteCount]);

  const setActiveMatch = useCallback((matchId: number | null) => {
    activeMatch.current = matchId;
  }, []);

  // ---- events from the server ----
  useSocketEvent('invite:received', (d: { room_code: string; sender: { display_name: string } }) => {
    setInviteCount((c) => c + 1);
    show({ kind: 'invite', title: `${d.sender.display_name} invited you to a room`, message: `Room code ${d.room_code}`, actionLabel: 'Open', onAction: () => navigate('Invites') });
  });

  useSocketEvent('tournament:invited', (d: { tournament_name: string; sender: { display_name: string } }) => {
    setInviteCount((c) => c + 1);
    show({ kind: 'invite', title: `Tournament invite: ${d.tournament_name}`, message: `from ${d.sender.display_name}`, actionLabel: 'Open', onAction: () => navigate('Invites') });
  });

  useSocketEvent('tournament:match_ready', (d: { match_id: number; round_no: number; scheduled_at: string }) => {
    if (activeMatch.current === d.match_id) return;
    show({
      kind: 'trophy',
      title: `Round ${d.round_no}: your match is ready`,
      message: `Starts at ${formatTime(d.scheduled_at)} — join the lobby early!`,
      actionLabel: 'Go',
      onAction: () => navigate('Game', { matchId: d.match_id }),
    });
  });

  useSocketEvent('tournament:match_started', (d: { match_id: number; round_no: number }) => {
    if (activeMatch.current === d.match_id) return;
    show({ kind: 'trophy', title: 'Your tournament match has started!', message: `Round ${d.round_no}`, actionLabel: 'Play', onAction: () => navigate('Game', { matchId: d.match_id }) });
  });

  useSocketEvent('tournament:updated', (d: { tournament_id: number; reason: string; champion_id?: number }) => {
    const open = () => navigate('TournamentDetail', { tournamentId: d.tournament_id });
    if (d.reason === 'finished') {
      const iWon = d.champion_id === player?.player_id;
      show({ kind: 'trophy', title: iWon ? 'You are the champion! 🏆' : 'Tournament finished', actionLabel: 'View', onAction: open });
    } else if (d.reason === 'cancelled') {
      show({ kind: 'error', title: 'A tournament was cancelled', actionLabel: 'View', onAction: open });
    } else if (d.reason === 'removed') {
      show({ kind: 'error', title: 'You were removed from a tournament' });
    } else if (d.reason === 'started') {
      show({ kind: 'trophy', title: 'Your tournament has started!', message: 'Round 1 has been drawn', actionLabel: 'View', onAction: open });
    }
  });

  return (
    <NotificationContext.Provider value={{ showToast, inviteCount, refreshInviteCount, setActiveMatch }}>
      {children}
      {toast && (
        <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: slide }] }]}>
          <Pressable style={[styles.toast, toast.kind === 'error' && styles.toastError]} onPress={hide}>
            <Text style={styles.icon}>{ICONS[toast.kind]}</Text>
            <View style={styles.texts}>
              <Text style={styles.title} numberOfLines={2}>{toast.title}</Text>
              {!!toast.message && <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>}
            </View>
            {toast.actionLabel && (
              <Pressable
                style={styles.action}
                onPress={() => {
                  hide();
                  toast.onAction?.();
                }}
              >
                <Text style={styles.actionText}>{toast.actionLabel}</Text>
              </Pressable>
            )}
          </Pressable>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used inside NotificationProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000, elevation: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2860',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,201,60,0.45)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  toastError: { borderColor: 'rgba(255,77,109,0.6)' },
  icon: { fontSize: 26, marginRight: 10 },
  texts: { flex: 1 },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  message: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  action: { backgroundColor: colors.gold, borderRadius: radius.round, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  actionText: { color: '#2A1B00', fontWeight: '900', fontSize: 13 },
});
