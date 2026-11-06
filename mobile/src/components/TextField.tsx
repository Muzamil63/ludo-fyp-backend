// Text input with a label and an optional icon on the left.
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius } from '../theme';

type IconType = React.ComponentType<{ color?: string; size?: number }>;

interface Props extends TextInputProps {
  label?: string;
  icon?: IconType;
}

export default function TextField({ label, icon: Icon, style, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.box, focused && styles.boxFocused]}>
        {Icon && <Icon color={focused ? colors.gold : colors.textMuted} size={20} />}
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...inputProps}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: colors.gold, backgroundColor: 'rgba(255,201,60,0.06)' },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 13, marginLeft: 10 },
});
