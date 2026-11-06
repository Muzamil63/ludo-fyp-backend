// Round player picture: their emoji avatar, or their initials, with an optional coloured ring.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradients } from '../theme';

interface Props {
  avatar?: string | null;
  name?: string;
  size?: number;
  ring?: string; // ring colour, e.g. the player's Ludo colour
  dim?: boolean;
}

export default function Avatar({ avatar, name = '?', size = 44, ring, dim }: Props) {
  const initials = name.trim().slice(0, 2).toUpperCase();
  return (
    <View
      style={[
        styles.ring,
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderColor: ring || 'rgba(255,255,255,0.25)', opacity: dim ? 0.45 : 1 },
      ]}
    >
      <LinearGradient colors={gradients.primary} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
        {avatar ? (
          <Text style={{ fontSize: size * 0.55 }}>{avatar}</Text>
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '900' },
});
