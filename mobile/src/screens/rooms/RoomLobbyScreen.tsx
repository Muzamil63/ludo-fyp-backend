// Room lobby: big room code (share it), the seats filling up live, invite friends, host starts the game.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Play, Share2, UserPlus, LogOut } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import GameButton from '../../components/GameButton';
import Avatar from '../../components/Avatar';
import OptionPicker from '../../components/OptionPicker';
import LoadingView from '../../components/LoadingView';
import InviteFriendsSheet from '../../components/InviteFriendsSheet';
import { emitAck } from '../../api/socket';
import { roomApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { colors, ludo, radius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { MatchState, Seat } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomLobby'>;
const SEATS: Record<number, number[]> = { 2: [1, 3], 3: [1, 2, 3], 4: [1, 2, 3, 4] };
const SEAT_COLOR = { 1: 'red', 2: 'green', 3: 'yellow', 4: 'blue' } as const;

export default function RoomLobbyScreen({ navigation, route }: Props) {
  const { matchId, roomCode } = route.params;
  const { player, socketConnected, isGuest } = useAuth();
  const { showToast } = useNotify();
  const [state, setState] = useState<MatchState | null>(null);
  const [fillBots, setFillBots] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const started = useRef(false);

  const openGame = useCallback(() => {
    if (started.current) return;
    started.current = true;
    navigation.replace('Game', { matchId });
  }, [navigation, matchId]);

  // Join the lobby's live updates
  useEffect(() => {
    if (!socketConnected) return;
    emitAck<MatchState>('match:join', { match_id: matchId })
      .then((s) => (s.match.status === 'in_progress' ? openGame() : setState(s)))
      .catch((err) => {
        showToast('error', 'Could not open the room', errorMessage(err));
        navigation.goBack();
      });
  }, [socketConnected, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing this screen (back button or "Leave") = leaving the room, unless the game has started.
  useEffect(() => {
    return () => {
      if (started.current) return;
      roomApi.leave(matchId).catch(() => {});
      emitAck('match:leave', { match_id: matchId }).catch(() => {});
    };
  }, [matchId]);

  useSocketEvent('room:updated', (d: { match_id: number; status: string; seats: Seat[] }) => {
    if (d.match_id !== matchId) return;
    if (d.status === 'cancelled') {
      Alert.alert('Room closed', 'The host left, so the room was closed.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      return;
    }
    setState((s) => s && { ...s, seats: d.seats });
  });
  useSocketEvent('match:state', (d: MatchState & { match_id: number }) => {
    if (d.match_id === matchId && d.match.status === 'in_progress') openGame();
  });

  if (!state) {
    return (
      <ScreenBackground>
        <AppHeader title={`Room ${roomCode}`} />
        <LoadingView message="Opening the room…" />
      </ScreenBackground>
    );
  }

  const isHost = state.match.host_id === player?.player_id;
  const seatNos = SEATS[state.match.max_players];
  const emptySeats = seatNos.length - state.seats.length;

  async function start() {
    setStarting(true);
    try {
      await roomApi.start(matchId, fillBots); // everyone gets "match:state" → the game opens
    } catch (err) {
      showToast('error', 'Could not start', errorMessage(err));
      setStarting(false);
    }
  }

  const leave = () => navigation.goBack(); // the cleanup above tells the server

  return (
    <ScreenBackground>
      <AppHeader title="Room Lobby" subtitle={`${state.match.rule_set.name} rules · ${state.match.game_mode === '2v2' ? '2 vs 2' : 'Free for all'}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.codeCard} highlight={colors.gold}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <Text style={styles.code}>{roomCode}</Text>
          <GameButton
            title="Share code"
            icon={Share2}
            size="sm"
            variant="ghost"
            onPress={() => Share.share({ message: `Join my Ludo Arena room! Code: ${roomCode}` })}
          />
        </GlassCard>

        <Text style={styles.section}>Players ({state.seats.length}/{seatNos.length})</Text>
        <View style={styles.seats}>
          {seatNos.map((no) => {
            const seat = state.seats.find((s) => s.seat_no === no);
            const color = ludo[SEAT_COLOR[no as 1 | 2 | 3 | 4]];
            return (
              <View key={no} style={[styles.seat, { borderColor: color.main }]}>
                {seat ? (
                  <>
                    <Avatar name={seat.display_name} size={46} ring={color.main} />
                    <Text style={styles.seatName} numberOfLines={1}>{seat.player_id === player?.player_id ? 'You' : seat.display_name}</Text>
                    {seat.player_id === state.match.host_id && <Text style={styles.host}>HOST</Text>}
                  </>
                ) : (
                  <>
                    <View style={[styles.emptyAvatar, { borderColor: color.main }]}>
                      <Text style={styles.emptyText}>?</Text>
                    </View>
                    <Text style={styles.waiting}>Waiting…</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {isHost ? (
          <GlassCard>
            {emptySeats > 0 && (
              <OptionPicker
                label={`${emptySeats} empty seat${emptySeats > 1 ? 's' : ''}`}
                value={fillBots}
                onChange={setFillBots}
                options={[{ label: '🤖 Fill with bots', value: true }, { label: 'Leave empty', value: false }]}
              />
            )}
            <GameButton title="Invite Friends" icon={UserPlus} variant="ghost" onPress={() => setInviteOpen(true)} />
            <GameButton title="Start Game" icon={Play} variant="gold" loading={starting} onPress={start} style={styles.gap} />
          </GlassCard>
        ) : (
          <Text style={styles.wait}>Waiting for the host to start the game…</Text>
        )}

        <GameButton title={isHost ? 'Close Room' : 'Leave Room'} icon={LogOut} variant="danger" size="md" onPress={leave} style={styles.leave} />
      </ScrollView>

      {isHost && !isGuest && (
        <InviteFriendsSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          excludeIds={state.seats.map((s) => s.player_id || 0)}
          onInvite={(friendId) => roomApi.invite(matchId, friendId)}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  codeCard: { alignItems: 'center' },
  codeLabel: { color: colors.textDim, fontWeight: '800', letterSpacing: 3, fontSize: 12 },
  code: { color: colors.gold, fontSize: 44, fontWeight: '900', letterSpacing: 8, marginVertical: 8 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  seats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  seat: { width: '48%', alignItems: 'center', padding: 14, borderRadius: radius.lg, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  seatName: { color: colors.text, fontWeight: '800', marginTop: 8 },
  host: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  emptyAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 22, fontWeight: '900' },
  waiting: { color: colors.textMuted, marginTop: 8 },
  wait: { color: colors.textDim, textAlign: 'center', fontSize: 16, fontWeight: '700', marginVertical: 16 },
  gap: { marginTop: 10 },
  leave: { marginTop: 18 },
});
