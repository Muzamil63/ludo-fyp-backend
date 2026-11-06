// Create an account: username, display name, email, password.
import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AtSign, Lock, Mail, Smile, UserPlus } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import GameButton from '../../components/GameButton';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    // Same rules as the backend, checked here first for a quicker answer
    if (!/^[A-Za-z0-9_]{3,30}$/.test(form.username)) return setError('Username: 3-30 letters, numbers or _');
    if (!form.email.includes('@')) return setError('Enter a valid email');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setError('');
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email.trim(), password: form.password, display_name: form.display_name.trim() || undefined });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <AppHeader title="Create account" subtitle="Unlock friends, rooms & tournaments" />
      <KeyboardAvoidingView behavior="height" style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <GlassCard>
            <TextField label="Username" icon={AtSign} value={form.username} onChangeText={set('username')} autoCapitalize="none" autoCorrect={false} placeholder="ludo_king" />
            <TextField label="Display name" icon={Smile} value={form.display_name} onChangeText={set('display_name')} placeholder="Shown to other players" maxLength={50} />
            <TextField label="Email" icon={Mail} value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
            <TextField label="Password" icon={Lock} value={form.password} onChangeText={set('password')} secureTextEntry placeholder="At least 6 characters" />
            <TextField label="Confirm password" icon={Lock} value={form.confirm} onChangeText={set('confirm')} secureTextEntry placeholder="Type it again" />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <GameButton title="Create Account" icon={UserPlus} variant="gold" loading={loading} onPress={submit} />
          </GlassCard>
          <Text style={styles.switch} onPress={() => navigation.replace('Login')}>
            Already have an account? <Text style={styles.link}>Log in</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  error: { color: colors.danger, marginBottom: 12, fontWeight: '700' },
  switch: { color: colors.textDim, textAlign: 'center', marginTop: 22, fontSize: 15 },
  link: { color: colors.gold, fontWeight: '900' },
});
