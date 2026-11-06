// Centered spinner with an optional message.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function LoadingView({ message }: { message?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.gold} />
      {!!message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { color: colors.textDim, marginTop: 14, fontSize: 15, textAlign: 'center' },
});
