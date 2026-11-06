// The app's main button: glossy gradient, shrinks a little when pressed, optional icon and loading spinner.
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, gradients, radius } from '../theme';

type Variant = 'primary' | 'gold' | 'danger' | 'success' | 'ghost';
type IconType = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconType;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const GRADIENT: Record<Exclude<Variant, 'ghost'>, string[]> = {
  primary: gradients.primary,
  gold: gradients.gold,
  danger: gradients.danger,
  success: gradients.success,
};

export default function GameButton({ title, onPress, variant = 'primary', size = 'lg', icon: Icon, loading, disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const textColor = variant === 'gold' ? '#3A2600' : colors.text;
  const height = size === 'lg' ? 56 : size === 'md' ? 46 : 36;
  const fontSize = size === 'lg' ? 17 : size === 'md' ? 15 : 13;
  const inactive = disabled || loading;

  const content = (
    <View style={[styles.inner, { height }]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {Icon && <Icon color={textColor} size={fontSize + 4} strokeWidth={2.5} />}
          <Text style={[styles.text, { color: textColor, fontSize, marginLeft: Icon ? 8 : 0 }]}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable onPress={onPress} disabled={inactive} onPressIn={() => press(0.96)} onPressOut={() => press(1)}>
        {variant === 'ghost' ? (
          <View style={[styles.base, styles.ghost]}>{content}</View>
        ) : (
          <LinearGradient colors={GRADIENT[variant]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.base, styles.shadow]}>
            <View style={styles.shine} />
            {content}
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, overflow: 'hidden' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  text: { fontWeight: '900', letterSpacing: 0.4 },
  ghost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)' },
  shadow: { elevation: 6 },
  // glossy highlight on the top half of the button
  shine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.14)' },
});
