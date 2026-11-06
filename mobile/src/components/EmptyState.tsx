// Friendly placeholder when a list is empty (big emoji, title, text, optional button).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GameButton from './GameButton';
import { colors } from '../theme';

interface Props {
  emoji: string;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ emoji, title, text, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!text && <Text style={styles.text}>{text}</Text>}
      {actionLabel && onAction && <GameButton title={actionLabel} onPress={onAction} size="md" variant="gold" style={styles.button} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emoji: { fontSize: 54, marginBottom: 10 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.textDim, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  button: { marginTop: 18, minWidth: 200 },
});
