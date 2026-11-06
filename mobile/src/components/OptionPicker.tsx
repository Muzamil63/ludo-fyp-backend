// A row of selectable chips (e.g. "2 / 3 / 4 players"). The chosen chip glows gold.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export interface Option<T> {
  label: string;
  value: T;
  hint?: string;
  disabled?: boolean;
}

interface Props<T> {
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function OptionPicker<T extends string | number | boolean>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              disabled={o.disabled}
              onPress={() => onChange(o.value)}
              style={[styles.chip, selected && styles.chipSelected, o.disabled && styles.chipDisabled]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
              {!!o.hint && <Text style={[styles.hint, selected && styles.hintSelected]}>{o.hint}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexGrow: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: 'rgba(255,201,60,0.16)', borderColor: colors.gold },
  chipDisabled: { opacity: 0.35 },
  chipText: { color: colors.textDim, fontWeight: '800', fontSize: 15 },
  chipTextSelected: { color: colors.gold },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  hintSelected: { color: '#FFE3A1' },
});
