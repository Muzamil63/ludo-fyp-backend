// A tournament in a list: name, status, players bar, format, rules and when it starts.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, Users, Swords } from 'lucide-react-native';
import GlassCard from './GlassCard';
import StatusPill from './StatusPill';
import { useNow } from '../hooks/useNow';
import { formatCountdown, formatDateTime } from '../utils/format';
import { colors } from '../theme';
import type { Tournament } from '../types';

export default function TournamentCard({ t, onPress }: { t: Tournament; onPress: () => void }) {
  const now = useNow(1000);
  const startsIn = new Date(t.start_time).getTime() - now;
  const fill = Math.min(1, t.participant_count / t.max_participants);

  return (
    <GlassCard style={styles.card} onPress={onPress} highlight={t.status === 'in_progress' ? colors.danger : undefined}>
      <View style={styles.top}>
        <Text style={styles.trophy}>🏆</Text>
        <View style={styles.titleBox}>
          <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
          <Text style={styles.by}>by @{t.creator_username}</Text>
        </View>
        <StatusPill status={t.status} label={t.status === 'in_progress' ? `Live · R${t.current_round}` : undefined} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Swords color={colors.textDim} size={15} />
          <Text style={styles.metaText}>{t.players_per_match === 2 ? '1 vs 1' : '4 players'} · {t.rule_set_name}</Text>
        </View>
        <View style={styles.metaItem}>
          <Calendar color={colors.textDim} size={15} />
          <Text style={styles.metaText}>
            {t.status === 'registration' ? (startsIn > 0 ? `Starts in ${formatCountdown(startsIn)}` : 'Starting…') : formatDateTime(t.start_time)}
          </Text>
        </View>
      </View>

      <View style={styles.barRow}>
        <Users color={colors.gold} size={15} />
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${fill * 100}%` }]} />
        </View>
        <Text style={styles.count}>{t.participant_count}/{t.max_participants}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  trophy: { fontSize: 30, marginRight: 10 },
  titleBox: { flex: 1, marginRight: 8 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  by: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  meta: { marginTop: 12, gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: colors.textDim, fontSize: 13, marginLeft: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  count: { color: colors.text, fontWeight: '900', fontSize: 13 },
});
