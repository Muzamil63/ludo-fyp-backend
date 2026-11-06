// Full-screen background used by every screen: deep purple gradient + soft glows in the 4 Ludo colours.
import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradients, ludo } from '../theme';

// A soft round glow (fades out to transparent), drawn with SVG so it has no hard edge.
function Glow({ color, size, style }: { color: string; size: number; style: ViewStyle }) {
  const id = `glow-${color.replace('#', '')}`;
  return (
    <Svg width={size} height={size} style={[styles.glow, style]} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

interface Props {
  children: React.ReactNode;
  safeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenBackground({ children, safeBottom = true, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.background} style={styles.fill}>
      <Glow color={ludo.red.main} size={320} style={{ top: -120, left: -140 }} />
      <Glow color={ludo.blue.main} size={340} style={{ top: 140, right: -170 }} />
      <Glow color={ludo.green.main} size={300} style={{ bottom: 80, left: -160 }} />
      <Glow color={ludo.yellow.main} size={280} style={{ bottom: -120, right: -100 }} />
      <View style={[styles.fill, { paddingTop: insets.top, paddingBottom: safeBottom ? insets.bottom : 0 }, style]}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  glow: { position: 'absolute' },
});
