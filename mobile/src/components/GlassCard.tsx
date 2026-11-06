// A frosted-glass looking card used for lists and panels.
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, gradients, radius } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  highlight?: string; // optional coloured border (e.g. the player's colour)
}

export default function GlassCard({ children, style, onPress, highlight }: Props) {
  const card = (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, highlight ? { borderColor: highlight, borderWidth: 1.5 } : null, style]}
    >
      {children}
    </LinearGradient>
  );
  if (!onPress) return card;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    overflow: 'hidden',
  },
});
