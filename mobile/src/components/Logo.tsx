// The "LUDO ARENA" logo: four bouncing tokens in the Ludo colours above the title.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import TokenPiece from './TokenPiece';
import { colors, LudoColor } from '../theme';

const ORDER: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

export default function Logo({ size = 1 }: { size?: number }) {
  const bounce = useRef(ORDER.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = bounce.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: -12, duration: 360, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 360, useNativeDriver: true }),
          Animated.delay((ORDER.length - i) * 160 + 600),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [bounce]);

  return (
    <View style={styles.wrap}>
      <View style={styles.tokens}>
        {ORDER.map((c, i) => (
          <Animated.View key={c} style={{ transform: [{ translateY: bounce[i] }], marginHorizontal: 4 }}>
            <TokenPiece color={c} size={44 * size} />
          </Animated.View>
        ))}
      </View>
      <Text style={[styles.ludo, { fontSize: 54 * size }]}>LUDO</Text>
      <Text style={[styles.arena, { fontSize: 18 * size, letterSpacing: 10 * size }]}>ARENA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tokens: { flexDirection: 'row', marginBottom: 6, height: 70, alignItems: 'flex-end' },
  ludo: {
    color: colors.text,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: 'rgba(124,92,255,0.9)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  arena: { color: colors.gold, fontWeight: '900', marginTop: -4 },
});
