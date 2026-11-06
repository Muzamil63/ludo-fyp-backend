// Screen title bar: round back button, title (+ optional subtitle) and an optional element on the right.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, back = true, onBack, right }: Props) {
  const navigation = useNavigation();
  return (
    <View style={styles.row}>
      {back ? (
        <Pressable style={styles.back} onPress={onBack || (() => navigation.goBack())} hitSlop={10}>
          <ChevronLeft color={colors.text} size={24} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 0 },
  texts: { flex: 1, marginHorizontal: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.textDim, fontSize: 13, marginTop: 1 },
  right: { minWidth: 42, alignItems: 'flex-end' },
});
