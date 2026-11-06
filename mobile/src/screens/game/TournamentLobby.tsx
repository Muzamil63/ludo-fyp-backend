// Shown on the game screen while a tournament match is still waiting to start:
// round info, countdown to the start time, and who is already in the lobby.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassCard from '../../components/GlassCard';
import Avatar from '../../components/Avatar';
import { useNow } from '../../hooks/useNow';
import { formatCountdown, formatTime } from '../../utils/format';
import { colors, ludo } from '../../theme';
import type { Match, Seat } from '../../types';

interface Props {
  match: Match;
  seats: Seat[];
  presentIds: number[];
  myPlayerId?: number;
}

export default function TournamentLobby({ match, seats, presentIds, myPlayerId }: Props) {
  const now = useNow();
  const startsAt = match.scheduled_at ? new Date(match.scheduled_at).getTime() : now;
  const left = startsAt - now;

  return (
    <GlassCard style={styles.card} highlight={colors.gold}>
      <Text style={styles.round}>🏆 Round {match.round_no} · Match {match.match_no}</Text>
      <Text style={styles.countdown}>{left > 0 ? formatCountdown(left) : 'Starting…'}</Text>
      <Text style={styles.at}>Starts at {formatTime(startsAt)} — or as soon as everyone is here</Text>

      <View style={styles.players}>
        {seats.map((s) => {
          const here = s.player_id !== null && presentIds.includes(s.player_id);
          return (
            <View key={s.seat_no} style={styles.player}>
              <Avatar name={s.display_name} size={44} ring={ludo[s.color].main} dim={!here} />
              <Text style={styles.name} numberOfLines={1}>
                {s.player_id === myPlayerId ? 'You' : s.display_name}
              </Text>
              <Text style={[styles.state, { color: here ? colors.success : colors.textMuted }]}>{here ? '● Ready' : '○ Waiting'}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>Stay on this screen. Absent players are auto-played when the match starts.</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  round: { color: colors.gold, fontWeight: '900', fontSize: 15 },
  countdown: { color: colors.text, fontSize: 46, fontWeight: '900', marginTop: 6 },
  at: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  players: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18, gap: 14 },
  player: { alignItems: 'center', width: 74 },
  name: { color: colors.text, fontWeight: '800', fontSize: 12, marginTop: 6 },
  state: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
