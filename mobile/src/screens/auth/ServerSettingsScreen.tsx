// Change the backend address (emulator / USB phone / Wi-Fi phone) and test the connection.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Globe, Wifi, Save } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import GameButton from '../../components/GameButton';
import OptionPicker from '../../components/OptionPicker';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { DEFAULT_SERVER_URL } from '../../config';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ServerSettings'>;

const PRESETS = [
  { label: 'Emulator', value: DEFAULT_SERVER_URL, hint: '10.0.2.2' },
  { label: 'USB phone', value: 'http://localhost:3000', hint: 'adb reverse' },
];

export default function ServerSettingsScreen({ navigation }: Props) {
  const { serverUrl, changeServerUrl, player, logout } = useAuth();
  const { showToast } = useNotify();
  const [url, setUrl] = useState(serverUrl);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Calls /api/health on the typed address (without saving it yet).
  async function test() {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch(`${url.trim().replace(/\/+$/, '')}/api/health`);
      const json = await res.json();
      setStatus(json.success ? { ok: true, text: 'Connected! Server and database are OK.' } : { ok: false, text: json.message || 'Server answered with an error' });
    } catch {
      setStatus({ ok: false, text: 'No answer. Is the backend running and the address correct?' });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    await changeServerUrl(url);
    showToast('success', 'Server address saved');
    if (player) await logout(); // a session belongs to one server → back to the welcome screen
    else navigation.goBack();
  }

  return (
    <ScreenBackground>
      <AppHeader title="Server" subtitle="Where the Ludo backend is running" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GlassCard>
          <OptionPicker label="Quick pick" options={PRESETS} value={url} onChange={setUrl} />
          <TextField label="Server address" icon={Globe} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          {status && <Text style={[styles.status, { color: status.ok ? colors.success : colors.danger }]}>{status.text}</Text>}
          <View style={styles.row}>
            <GameButton title="Test" icon={Wifi} variant="ghost" size="md" loading={testing} onPress={test} style={styles.half} />
            <GameButton title="Save" icon={Save} variant="gold" size="md" onPress={save} style={styles.half} />
          </View>
        </GlassCard>
        <GlassCard style={styles.help}>
          <Text style={styles.helpTitle}>Which address?</Text>
          <Text style={styles.helpText}>• Android emulator: http://10.0.2.2:3000</Text>
          <Text style={styles.helpText}>• Phone on the same Wi-Fi: http://YOUR-PC-IP:3000 (run ipconfig on the PC)</Text>
          <Text style={styles.helpText}>• Phone on USB: run "adb reverse tcp:3000 tcp:3000", then use http://localhost:3000</Text>
          <Text style={styles.helpText}>• Change 3000 if the backend uses another PORT.</Text>
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  status: { fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  help: { marginTop: 16 },
  helpTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 8 },
  helpText: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
});
