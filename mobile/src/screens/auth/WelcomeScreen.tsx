// First screen: logo, "Play as guest", "Log in", "Create account", and the server settings gear.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Settings, UserRound, LogIn, UserPlus } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import Logo from '../../components/Logo';
import GameButton from '../../components/GameButton';
import BottomSheet from '../../components/BottomSheet';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { errorMessage } from '../../api/client';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { playAsGuest, serverUrl } = useAuth();
  const { showToast } = useNotify();
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  async function startGuest() {
    setLoading(true);
    try {
      await playAsGuest(guestName.trim());
    } catch (err) {
      showToast('error', 'Could not start', errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <Pressable style={styles.gear} onPress={() => navigation.navigate('ServerSettings')} hitSlop={12}>
        <Settings color={colors.textDim} size={24} />
      </Pressable>

      <View style={styles.top}>
        <Logo />
        <Text style={styles.tagline}>Roll. Race. Rule the board.</Text>
      </View>

      <View style={styles.bottom}>
        <GameButton title="Play as Guest" icon={UserRound} variant="gold" onPress={() => setGuestOpen(true)} />
        <GameButton title="Log In" icon={LogIn} onPress={() => navigation.navigate('Login')} style={styles.gap} />
        <GameButton title="Create Account" icon={UserPlus} variant="ghost" onPress={() => navigation.navigate('Register')} style={styles.gap} />
        <Text style={styles.note}>Guests can play vs computer, online and join rooms.{'\n'}Create an account for friends, rooms and tournaments.</Text>
        <Text style={styles.server}>Server: {serverUrl}</Text>
      </View>

      <BottomSheet visible={guestOpen} title="Play as Guest" onClose={() => setGuestOpen(false)}>
        <TextField label="Your name (optional)" placeholder="e.g. Ali" value={guestName} onChangeText={setGuestName} maxLength={50} icon={UserRound} />
        <GameButton title="Let's Play" variant="gold" loading={loading} onPress={startGuest} />
      </BottomSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  gear: { position: 'absolute', top: 14, right: 20, zIndex: 5 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagline: { color: colors.textDim, fontSize: 16, marginTop: 14, letterSpacing: 1 },
  bottom: { paddingHorizontal: 24, paddingBottom: 20 },
  gap: { marginTop: 12 },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 18 },
  server: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
