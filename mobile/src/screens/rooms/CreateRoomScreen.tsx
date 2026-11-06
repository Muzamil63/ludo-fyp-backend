// Host a private room: choose seats, mode and rules; you get a 6-letter code to share.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DoorOpen } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import OptionPicker from '../../components/OptionPicker';
import GameButton from '../../components/GameButton';
import { matchApi, roomApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { ruleSetHint } from '../game/BotSetupScreen';
import type { RootStackParamList } from '../../navigation/types';
import type { RuleSet } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRoom'>;

export default function CreateRoomScreen({ navigation }: Props) {
  const { showToast } = useNotify();
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [ruleSetId, setRuleSetId] = useState(1);
  const [players, setPlayers] = useState(4);
  const [mode, setMode] = useState<'ffa' | '2v2'>('ffa');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    matchApi.ruleSets().then(setRuleSets).catch(() => {});
  }, []);

  async function create() {
    setLoading(true);
    try {
      const room = await roomApi.create({ rule_set_id: ruleSetId, max_players: players, game_mode: mode });
      navigation.replace('RoomLobby', { matchId: room.match_id, roomCode: room.room_code });
    } catch (err) {
      showToast('error', 'Could not create room', errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <AppHeader title="Create Room" subtitle="Invite friends or share the code" />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard>
          <OptionPicker
            label="Seats"
            value={players}
            onChange={(p) => {
              setPlayers(p);
              if (p !== 4) setMode('ffa');
            }}
            options={[{ label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }]}
          />
          <OptionPicker
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[{ label: 'Free for all', value: 'ffa' }, { label: '2 vs 2', value: '2v2', disabled: players !== 4, hint: players !== 4 ? 'needs 4' : undefined }]}
          />
          <OptionPicker label="Rules" value={ruleSetId} onChange={setRuleSetId} options={ruleSets.map((r) => ({ label: r.name, value: r.rule_set_id, hint: ruleSetHint(r) }))} />
          <GameButton title="Create Room" icon={DoorOpen} variant="gold" loading={loading} onPress={create} />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({ content: { padding: 20 } });
