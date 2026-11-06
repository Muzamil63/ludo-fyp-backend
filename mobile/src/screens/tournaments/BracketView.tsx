// The knockout bracket: one column per round, one card per match (players, winner, time, status).
// The creator gets "Start now" / "Change time" on waiting matches; players get "Play" on their match.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, Play, Zap, Crown } from 'lucide-react-native';
import GlassCard from '../../components/GlassCard';
import StatusPill from '../../components/StatusPill';
import GameButton from '../../components/GameButton';
import { useNow } from '../../hooks/useNow';
import { formatCountdown, formatDateTime, formatTime } from '../../utils/format';
import { colors, ludo } from '../../theme';
import type { BracketMatch } from '../../types';

interface Props {
  rounds: { round_no: number; matches: BracketMatch[] }[];
  myPlayerId?: number;
  isCreator: boolean;
  nextRoundNote?: string;
  busy: string | null;
  onPlay: (matchId: number) => void;
  onStartNow: (matchId: number) => void;
  onChangeTime: (match: BracketMatch) => void;
}

export default function BracketView({ rounds, myPlayerId, isCreator, nextRoundNote, busy, onPlay, onStartNow, onChangeTime }: Props) {
  const now = useNow();
  const lastRound = rounds[rounds.length - 1];
  const roundName = (no: number, matchCount: number) => (no === lastRound?.round_no && matchCount === 1 && !nextRoundNote ? 'Final' : `Round ${no}`);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {rounds.map((round) => (
        <View key={round.round_no} style={styles.column}>
          <Text style={styles.roundTitle}>{roundName(round.round_no, round.matches.length)}</Text>
          {round.matches.map((m) => {
            const mine = m.seats.some((s) => s.player_id === myPlayerId);
            const open = m.status === 'waiting' || m.status === 'in_progress';
            const left = new Date(m.scheduled_at).getTime() - now;
            return (
              <GlassCard key={m.match_id} style={styles.match} highlight={mine && open ? colors.gold : undefined}>
                <View style={styles.matchTop}>
                  <Text style={styles.matchNo}>Match {m.match_no}</Text>
                  <StatusPill status={m.status} label={m.status === 'in_progress' ? 'Live' : undefined} />
                </View>
                <View style={styles.timeRow}>
                  <Clock color={colors.textMuted} size={13} />
                  <Text style={styles.time}>
                    {m.status === 'waiting' ? (left > 0 ? `${formatTime(m.scheduled_at)} · in ${formatCountdown(left)}` : 'Starting…') : formatDateTime(m.scheduled_at)}
                  </Text>
                </View>

                {m.seats.map((s) => {
                  const winner = m.winner_id !== null && s.player_id === m.winner_id;
                  const lost = m.status === 'finished' && !winner;
                  return (
                    <View key={s.seat_no} style={[styles.seat, winner && styles.seatWinner]}>
                      <View style={[styles.dot, { backgroundColor: ludo[s.color].main }]} />
                      <Text style={[styles.seatName, lost && styles.lost, s.player_id === myPlayerId && styles.me]} numberOfLines={1}>
                        {s.player_id === myPlayerId ? 'You' : s.display_name}
                      </Text>
                      {winner && <Crown color={colors.gold} size={16} />}
                    </View>
                  );
                })}

                {mine && open && (
                  <GameButton title={m.status === 'in_progress' ? 'Play now' : 'Enter lobby'} icon={Play} size="sm" variant="gold" onPress={() => onPlay(m.match_id)} style={styles.btn} />
                )}
                {isCreator && m.status === 'waiting' && (
                  <View style={styles.creatorRow}>
                    <GameButton title="Start now" icon={Zap} size="sm" variant="success" loading={busy === `start-${m.match_id}`} onPress={() => onStartNow(m.match_id)} style={styles.half} />
                    <GameButton title="Time" icon={Clock} size="sm" variant="ghost" onPress={() => onChangeTime(m)} style={styles.half} />
                  </View>
                )}
              </GlassCard>
            );
          })}
        </View>
      ))}
      {nextRoundNote && (
        <View style={[styles.column, styles.nextColumn]}>
          <Text style={styles.roundTitle}>Next round</Text>
          <GlassCard style={styles.match}>
            <Text style={styles.nextText}>{nextRoundNote}</Text>
          </GlassCard>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  column: { width: 230 },
  nextColumn: { opacity: 0.7 },
  roundTitle: { color: colors.gold, fontWeight: '900', fontSize: 15, marginBottom: 8, letterSpacing: 0.5 },
  match: { marginBottom: 12, padding: 12 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchNo: { color: colors.text, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 },
  time: { color: colors.textMuted, fontSize: 12, marginLeft: 5 },
  seat: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.05)' },
  seatWinner: { backgroundColor: 'rgba(255,201,60,0.18)' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  seatName: { flex: 1, color: colors.text, fontWeight: '700' },
  lost: { color: colors.textMuted, textDecorationLine: 'line-through' },
  me: { color: colors.gold },
  btn: { marginTop: 10 },
  creatorRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  half: { flex: 1 },
  nextText: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
