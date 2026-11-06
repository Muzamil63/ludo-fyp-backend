// Join a private room by typing its 6-letter code (guests can do this too).
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LogIn } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import GameButton from '../../components/GameButton';
import { roomApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { colors, radius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>;
const LENGTH = 6;

export default function JoinRoomScreen({ navigation, route }: Props) {
  const [code, setCode] = useState((route.params?.code || '').toUpperCase());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  async function join() {
    if (code.length !== LENGTH) return setError('Room codes have 6 characters');
    setError('');
    setLoading(true);
    try {
      const room = await roomApi.join(code);
      navigation.replace('RoomLobby', { matchId: room.match_id, roomCode: room.room_code });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <AppHeader title="Join Room" subtitle="Ask the host for the room code" />
      <View style={styles.content}>
        <GlassCard>
          <Text style={styles.label}>Room code</Text>
          {/* One hidden input + 6 boxes that show the letters */}
          <Pressable style={styles.boxes} onPress={() => input.current?.focus()}>
            {Array.from({ length: LENGTH }).map((_, i) => (
              <View key={i} style={[styles.box, i === code.length && styles.boxActive]}>
                <Text style={styles.letter}>{code[i] || ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LENGTH))}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.hidden}
            onSubmitEditing={join}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <GameButton title="Join" icon={LogIn} variant="gold" loading={loading} onPress={join} disabled={code.length !== LENGTH} />
        </GlassCard>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  box: { width: 46, height: 58, borderRadius: radius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: colors.gold },
  letter: { color: colors.text, fontSize: 26, fontWeight: '900' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 12 },
});
