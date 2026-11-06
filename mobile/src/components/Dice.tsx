// The dice. Shakes and shows random faces while rolling, then lands on the value the server rolled.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Which of the 9 spots (3 x 3 grid) have a pip, for faces 1..6.
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface Props {
  value: number | null;
  rolling: boolean;
  onPress?: () => void;
  disabled?: boolean;
  glowColor?: string; // colour of the player whose turn it is
  size?: number;
}

export default function Dice({ value, rolling, onPress, disabled, glowColor = colors.gold, size = 68 }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [face, setFace] = useState(value || 6);

  // While rolling: spin + flick through random faces
  useEffect(() => {
    if (!rolling) return;
    const shuffle = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => {
      clearInterval(shuffle);
      loop.stop();
      spin.setValue(0);
    };
  }, [rolling, spin]);

  // Landed: show the real value with a little bounce
  useEffect(() => {
    if (rolling || !value) return;
    setFace(value);
    bounce.setValue(1.25);
    Animated.spring(bounce, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [value, rolling, bounce]);

  // "Tap me" pulse when it is my turn to roll
  const canRoll = !disabled && !rolling && !!onPress;
  useEffect(() => {
    if (!canRoll) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [canRoll, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pip = size * 0.17;

  return (
    <Pressable onPress={onPress} disabled={!canRoll} hitSlop={12}>
      <Animated.View
        style={[
          styles.glow,
          { width: size + 18, height: size + 18, borderRadius: (size + 18) * 0.3, borderColor: glowColor, shadowColor: glowColor, opacity: canRoll || rolling ? 1 : 0.85 },
          { transform: [{ scale: Animated.multiply(bounce, pulse) }, { rotate }] },
        ]}
      >
        <View style={[styles.die, { width: size, height: size, borderRadius: size * 0.24, padding: size * 0.14 }]}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.spot}>
              {PIPS[face].includes(i) && (
                <View style={{ width: pip, height: pip, borderRadius: pip / 2, backgroundColor: face === 1 ? colors.danger : '#1B1F3B' }} />
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  die: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 5,
    borderBottomColor: '#C9CDE6',
  },
  spot: { width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' },
});
