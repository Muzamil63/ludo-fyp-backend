// Small coloured label for a tournament / match status ("Open", "Live", "Finished" ...).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const STATUS: Record<string, { label: string; color: string }> = {
  registration: { label: 'Open', color: colors.success },
  in_progress: { label: 'Live', color: colors.danger },
  finished: { label: 'Finished', color: colors.textMuted },
  cancelled: { label: 'Cancelled', color: colors.textMuted },
  waiting: { label: 'Scheduled', color: colors.info },
  active: { label: 'Playing', color: colors.success },
  eliminated: { label: 'Out', color: colors.textMuted },
  champion: { label: 'Champion', color: colors.gold },
};

export default function StatusPill({ status, label }: { status: string; label?: string }) {
  const s = STATUS[status] || { label: status, color: colors.textDim };
  return (
    <View style={[styles.pill, { borderColor: s.color, backgroundColor: `${s.color}22` }]}>
      {status === 'in_progress' && <View style={[styles.dot, { backgroundColor: s.color }]} />}
      <Text style={[styles.text, { color: s.color }]}>{label || s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  text: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
});
