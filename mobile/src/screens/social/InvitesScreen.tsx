// My invitations: room invites (join the lobby) and tournament invites (join the tournament).
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, X } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import GameButton from '../../components/GameButton';
import EmptyState from '../../components/EmptyState';
import { roomApi, tournamentApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { formatDateTime } from '../../utils/format';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { RoomInvitation, TournamentInvitation } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Invites'>;

export default function InvitesScreen({ navigation }: Props) {
  const { showToast, refreshInviteCount } = useNotify();
  const [rooms, setRooms] = useState<RoomInvitation[]>([]);
  const [tournaments, setTournaments] = useState<TournamentInvitation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([roomApi.invitations(), tournamentApi.invitations()]);
      setRooms(r);
      setTournaments(t);
    } catch (err) {
      showToast('error', 'Could not load invitations', errorMessage(err));
    }
    refreshInviteCount();
  }, [showToast, refreshInviteCount]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  useSocketEvent('invite:received', () => load());
  useSocketEvent('tournament:invited', () => load());

  async function answerRoom(inv: RoomInvitation, action: 'accept' | 'decline') {
    setBusy(`r${inv.invitation_id}`);
    try {
      const res = await roomApi.respond(inv.invitation_id, action);
      if (action === 'accept') navigation.replace('RoomLobby', { matchId: res.match_id, roomCode: res.room_code });
      else await load();
    } catch (err) {
      showToast('error', errorMessage(err));
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function answerTournament(inv: TournamentInvitation, action: 'accept' | 'decline') {
    setBusy(`t${inv.invitation_id}`);
    try {
      await tournamentApi.respond(inv.invitation_id, action);
      if (action === 'accept') {
        showToast('success', `You joined ${inv.tournament_name}!`);
        navigation.replace('TournamentDetail', { tournamentId: inv.tournament_id });
      } else await load();
    } catch (err) {
      showToast('error', errorMessage(err));
      await load();
    } finally {
      setBusy(null);
    }
  }

  const empty = rooms.length === 0 && tournaments.length === 0;

  return (
    <ScreenBackground>
      <AppHeader title="Invitations" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.gold} />}
      >
        {empty && <EmptyState emoji="📭" title="No invitations" text="When friends invite you to a room or a tournament, it shows up here." />}

        {tournaments.length > 0 && <Text style={styles.section}>Tournaments</Text>}
        {tournaments.map((inv) => (
          <GlassCard key={`t${inv.invitation_id}`} style={styles.card} highlight={colors.gold}>
            <Text style={styles.title}>🏆 {inv.tournament_name}</Text>
            <Text style={styles.sub}>
              {inv.sender_display_name} invited you · {inv.players_per_match === 2 ? '1 vs 1' : '4 players'} · {inv.max_participants} players
            </Text>
            <Text style={styles.sub}>Starts {formatDateTime(inv.start_time)}</Text>
            <View style={styles.row}>
              <GameButton title="Decline" icon={X} variant="ghost" size="md" style={styles.half} onPress={() => answerTournament(inv, 'decline')} />
              <GameButton title="Join" icon={Check} variant="gold" size="md" style={styles.half} loading={busy === `t${inv.invitation_id}`} onPress={() => answerTournament(inv, 'accept')} />
            </View>
          </GlassCard>
        ))}

        {rooms.length > 0 && <Text style={styles.section}>Rooms</Text>}
        {rooms.map((inv) => (
          <GlassCard key={`r${inv.invitation_id}`} style={styles.card}>
            <Text style={styles.title}>🎲 Room {inv.room_code}</Text>
            <Text style={styles.sub}>{inv.sender_display_name} wants to play with you</Text>
            <View style={styles.row}>
              <GameButton title="Decline" icon={X} variant="ghost" size="md" style={styles.half} onPress={() => answerRoom(inv, 'decline')} />
              <GameButton title="Join Room" icon={Check} variant="gold" size="md" style={styles.half} loading={busy === `r${inv.invitation_id}`} onPress={() => answerRoom(inv, 'accept')} />
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 10, marginBottom: 10 },
  card: { marginBottom: 12 },
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  sub: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  half: { flex: 1 },
});
