// Log in with username (or email) and password.
import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AtSign, Lock, LogIn } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import GameButton from '../../components/GameButton';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !password) return setError('Enter your username and password');
    setError('');
    setLoading(true);
    try {
      await login(name.trim(), password); // on success the app switches to the home screen by itself
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <AppHeader title="Welcome back" subtitle="Log in to your account" />
      <KeyboardAvoidingView behavior="height" style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <GlassCard>
            <TextField label="Username or email" icon={AtSign} value={name} onChangeText={setName} autoCapitalize="none" autoCorrect={false} placeholder="demo1" />
            <TextField label="Password" icon={Lock} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" onSubmitEditing={submit} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <GameButton title="Log In" icon={LogIn} loading={loading} onPress={submit} />
          </GlassCard>
          <Text style={styles.switch} onPress={() => navigation.replace('Register')}>
            New here? <Text style={styles.link}>Create an account</Text>
          </Text>
          <Text style={styles.hint}>Demo accounts: demo1 … demo4, password: password123</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20 },
  error: { color: colors.danger, marginBottom: 12, fontWeight: '700' },
  switch: { color: colors.textDim, textAlign: 'center', marginTop: 22, fontSize: 15 },
  link: { color: colors.gold, fontWeight: '900' },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: 14, fontSize: 12 },
});
