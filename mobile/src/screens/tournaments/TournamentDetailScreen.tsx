// One tournament: info, the right buttons for me (join / leave / invite / creator controls),
// my next match, the players, the bracket and the champion. Refreshes live on "tournament:updated".
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Edit3, LogIn, LogOut, Play, UserPlus, XCircle, Zap, X } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import GameButton from '../../components/GameButton';
import StatusPill from '../../components/StatusPill';
import Avatar from '../../components/Avatar';
import LoadingView from '../../components/LoadingView';
import InviteFriendsSheet from '../../components/InviteFriendsSheet';
import BracketView from './BracketView';
import { tournamentApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useNow } from '../../hooks/useNow';
import { pickDateTime } from '../../utils/pickDateTime';
import { formatCountdown, formatDateTime } from '../../utils/format';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { BracketMatch, TournamentDetail } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function TournamentDetailScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const { player } = useAuth();
  const { showToast } = useNotify();
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    try {
      setData(await tournamentApi.detail(tournamentId));
    } catch (err) {
      showToast('error', 'Could not load tournament', errorMessage(err));
    }
  }, [tournamentId, showToast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  useSocketEvent('tournament:updated', (d: { tournament_id: number }) => d.tournament_id === tournamentId && load());
  useSocketEvent('tournament:match_ready', (d: { tournament_id: number }) => d.tournament_id === tournamentId && load());

  // Runs an action, shows success / error, then reloads the tournament.
  async function act(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await action();
      showToast('success', success);
      await load();
    } catch (err) {
      showToast('error', errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <ScreenBackground>
        <AppHeader title="Tournament" />
        <LoadingView message="Loading tournament…" />
      </ScreenBackground>
    );
  }

  const { tournament: t, participants, rounds, champion } = data;
  const me = player?.player_id;
  const isCreator = t.creator_id === me;
  const myEntry = participants.find((p) => p.player_id === me);
  const full = participants.length >= t.max_participants;
  const myMatch = rounds.flatMap((r) => r.matches).find((m) => (m.status === 'waiting' || m.status === 'in_progress') && m.seats.some((s) => s.player_id === me));
  const startsIn = new Date(t.start_time).getTime() - now;
  const roundRunning = rounds.length > 0 && rounds[rounds.length - 1].matches.some((m) => m.status !== 'finished' && m.status !== 'cancelled');
  const nextRoundNote =
    t.status === 'in_progress' && roundRunning && participants.filter((p) => p.status === 'active').length > t.players_per_match
      ? `Winners of this round meet here. It is drawn ${t.round_break_minutes} min after the last match ends.`
      : undefined;

  const confirm = (title: string, message: string, onYes: () => void) =>
    Alert.alert(title, message, [{ text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);

  async function changeTime(m: BracketMatch) {
    const initial = new Date(Math.max(new Date(m.scheduled_at).getTime(), Date.now() + 5 * 60000));
    const picked = await pickDateTime(initial);
    if (!picked) return;
    act(`time-${m.match_id}`, () => tournamentApi.rescheduleMatch(t.tournament_id, m.match_id, picked.toISOString()), 'Match time changed — players were told');
  }

  return (
    <ScreenBackground>
      <AppHeader title={t.name} subtitle={`by @${t.creator_username}${isCreator ? ' (you)' : ''}`} right={<StatusPill status={t.status} />} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.gold} />}
      >
        {/* champion */}
        {t.status === 'finished' && champion && (
          <GlassCard style={styles.champion} highlight={colors.gold}>
            <Text style={styles.championEmoji}>🏆</Text>
            <Text style={styles.championLabel}>CHAMPION</Text>
            <Avatar avatar={champion.avatar} name={champion.display_name} size={64} ring={colors.gold} />
            <Text style={styles.championName}>{champion.player_id === me ? 'You!' : champion.display_name}</Text>
          </GlassCard>
        )}

        {/* my next match */}
        {myMatch && (
          <GlassCard style={styles.myMatch} highlight={myMatch.status === 'in_progress' ? colors.danger : colors.gold}>
            <Text style={styles.myMatchLabel}>YOUR MATCH · ROUND {myMatch.round_no}</Text>
            <Text style={styles.myMatchTitle}>
              {myMatch.status === 'in_progress' ? 'Live now!' : `Starts in ${formatCountdown(new Date(myMatch.scheduled_at).getTime() - now)}`}
            </Text>
            <Text style={styles.myMatchHint}>Enter the lobby early: the match starts as soon as everyone is there.</Text>
            <GameButton title={myMatch.status === 'in_progress' ? 'Play Now' : 'Enter Lobby'} icon={Play} variant="gold" onPress={() => navigation.push('Game', { matchId: myMatch.match_id })} style={styles.gap} />
          </GlassCard>
        )}

        {/* info */}
        <GlassCard style={styles.infoCard}>
          {!!t.description && <Text style={styles.description}>{t.description}</Text>}
          <InfoRow label="Format" value={t.players_per_match === 2 ? '1 vs 1 knockout' : '4-player matches, winner advances'} />
          <InfoRow label="Rules" value={t.rule_set_name} />
          <InfoRow label="Players" value={`${participants.length} / ${t.max_participants}`} />
          <InfoRow label={t.status === 'registration' ? 'Starts' : 'Started'} value={formatDateTime(t.start_time)} />
          {t.status === 'registration' && <InfoRow label="Countdown" value={startsIn > 0 ? formatCountdown(startsIn) : 'Starting…'} />}
          <InfoRow label="Break between rounds" value={`${t.round_break_minutes} min`} />
          {t.status === 'in_progress' && <InfoRow label="Current round" value={String(t.current_round)} />}
        </GlassCard>

        {/* actions */}
        {t.status === 'registration' && (
          <View style={styles.actions}>
            {!myEntry && (
              <GameButton title={full ? 'Tournament is full' : 'Join Tournament'} icon={LogIn} variant="gold" disabled={full} loading={busy === 'join'}
                onPress={() => act('join', () => tournamentApi.join(t.tournament_id), 'You joined the tournament!')} />
            )}
            {(isCreator || myEntry) && <GameButton title="Invite Friends" icon={UserPlus} variant="primary" disabled={full} onPress={() => setInviteOpen(true)} style={styles.gap} />}
            {myEntry && (
              <GameButton title="Leave Tournament" icon={LogOut} variant="ghost" loading={busy === 'leave'} style={styles.gap}
                onPress={() => confirm('Leave tournament?', 'You can join again before it starts.', () => act('leave', () => tournamentApi.leave(t.tournament_id), 'You left the tournament'))} />
            )}
            {isCreator && (
              <GlassCard style={styles.creatorBox}>
                <Text style={styles.creatorTitle}>👑 Creator controls</Text>
                <Text style={styles.creatorHint}>It starts by itself at the start time, or start it now.</Text>
                <View style={styles.row}>
                  <GameButton title="Edit" icon={Edit3} variant="ghost" size="md" style={styles.half} onPress={() => navigation.navigate('TournamentForm', { tournamentId: t.tournament_id })} />
                  <GameButton title="Start now" icon={Zap} variant="success" size="md" style={styles.half} loading={busy === 'start'} disabled={participants.length < 2}
                    onPress={() => confirm('Start now?', 'Registration closes and round 1 is drawn.', () => act('start', () => tournamentApi.start(t.tournament_id), 'Tournament started! Round 1 drawn'))} />
                </View>
                {participants.length < 2 && <Text style={styles.creatorHint}>At least 2 players are needed to start.</Text>}
                <GameButton title="Cancel Tournament" icon={XCircle} variant="danger" size="md" style={styles.gap} loading={busy === 'cancel'}
                  onPress={() => confirm('Cancel tournament?', 'Everyone will be told. This cannot be undone.', () => act('cancel', () => tournamentApi.cancel(t.tournament_id), 'Tournament cancelled'))} />
              </GlassCard>
            )}
          </View>
        )}
        {t.status === 'in_progress' && myEntry?.status === 'eliminated' && (
          <Text style={styles.info}>You were knocked out in round {myEntry.eliminated_round}. Keep watching the bracket!</Text>
        )}
        {t.status === 'in_progress' && isCreator && (
          <GameButton title="Cancel Tournament" icon={XCircle} variant="danger" size="md" style={styles.actions} loading={busy === 'cancel'}
            onPress={() => confirm('Cancel tournament?', 'Running matches will be stopped.', () => act('cancel', () => tournamentApi.cancel(t.tournament_id), 'Tournament cancelled'))} />
        )}
        {t.status === 'cancelled' && <Text style={styles.info}>This tournament was cancelled.</Text>}

        {/* bracket */}
        {rounds.length > 0 && (
          <>
            <Text style={styles.section}>Bracket</Text>
            <View style={styles.bracket}>
              <BracketView
                rounds={rounds}
                myPlayerId={me}
                isCreator={isCreator && t.status === 'in_progress'}
                nextRoundNote={nextRoundNote}
                busy={busy}
                onPlay={(matchId) => navigation.push('Game', { matchId })}
                onStartNow={(matchId) => act(`start-${matchId}`, () => tournamentApi.startMatchNow(t.tournament_id, matchId), 'Match started')}
                onChangeTime={changeTime}
              />
            </View>
          </>
        )}

        {/* players */}
        <Text style={styles.section}>Players ({participants.length})</Text>
        {participants.map((p) => (
          <View key={p.participant_id} style={styles.player}>
            <Avatar avatar={p.avatar} name={p.display_name} size={38} dim={p.status === 'eliminated'} ring={p.status === 'champion' ? colors.gold : undefined} />
            <View style={styles.playerText}>
              <Text style={styles.playerName}>
                {p.display_name}
                {p.player_id === me ? ' (you)' : ''}
                {p.player_id === t.creator_id ? ' 👑' : ''}
              </Text>
              <Text style={styles.playerUser}>@{p.username}{p.eliminated_round ? ` · out in round ${p.eliminated_round}` : ''}</Text>
            </View>
            {t.status !== 'registration' && <StatusPill status={p.status} />}
            {isCreator && t.status === 'registration' && p.player_id !== me && (
              <Pressable hitSlop={10} onPress={() => confirm('Remove player?', `${p.display_name} will be removed from the tournament.`, () =>
                act(`remove-${p.player_id}`, () => tournamentApi.removePlayer(t.tournament_id, p.player_id), 'Player removed'))}>
                <X color={colors.danger} size={22} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <InviteFriendsSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        excludeIds={participants.map((p) => p.player_id)}
        onInvite={(friendId) => tournamentApi.invite(t.tournament_id, friendId)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 12, paddingBottom: 40 },
  champion: { alignItems: 'center', marginHorizontal: 16, marginBottom: 14 },
  championEmoji: { fontSize: 50 },
  championLabel: { color: colors.gold, fontWeight: '900', letterSpacing: 4, marginBottom: 10 },
  championName: { color: colors.text, fontWeight: '900', fontSize: 22, marginTop: 8 },
  myMatch: { marginHorizontal: 16, marginBottom: 14 },
  myMatchLabel: { color: colors.gold, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  myMatchTitle: { color: colors.text, fontWeight: '900', fontSize: 24, marginTop: 4 },
  myMatchHint: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  infoCard: { marginHorizontal: 16 },
  description: { color: colors.text, fontSize: 15, marginBottom: 12, lineHeight: 21 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { color: colors.textDim, fontSize: 14 },
  infoValue: { color: colors.text, fontWeight: '800', fontSize: 14, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  actions: { marginHorizontal: 16, marginTop: 14 },
  gap: { marginTop: 10 },
  creatorBox: { marginTop: 14 },
  creatorTitle: { color: colors.gold, fontWeight: '900', fontSize: 16 },
  creatorHint: { color: colors.textDim, fontSize: 12, marginVertical: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  half: { flex: 1 },
  info: { color: colors.textDim, textAlign: 'center', marginTop: 14, marginHorizontal: 16 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 22, marginBottom: 10, marginHorizontal: 16 },
  bracket: { marginHorizontal: -0 },
  player: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  playerText: { flex: 1, marginLeft: 12 },
  playerName: { color: colors.text, fontWeight: '800', fontSize: 15 },
  playerUser: { color: colors.textMuted, fontSize: 12 },
});
