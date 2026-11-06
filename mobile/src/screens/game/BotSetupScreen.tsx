// "vs Computer" setup: number of players, mode, bot difficulty and rule set, then start.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Play } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import OptionPicker from '../../components/OptionPicker';
import GameButton from '../../components/GameButton';
import { matchApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { RuleSet } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'BotSetup'>;

export const ruleSetHint = (r: RuleSet) => `${r.tokens_to_win} home · ${r.turn_seconds}s`;

export default function BotSetupScreen({ navigation }: Props) {
  const { showToast } = useNotify();
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [ruleSetId, setRuleSetId] = useState(1);
  const [players, setPlayers] = useState(4);
  const [mode, setMode] = useState<'ffa' | '2v2'>('ffa');
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    matchApi.ruleSets().then(setRuleSets).catch((err) => showToast('error', 'Could not load rules', errorMessage(err)));
  }, [showToast]);

  async function start() {
    setLoading(true);
    try {
      const { match_id } = await matchApi.createBot({ rule_set_id: ruleSetId, total_players: players, game_mode: mode, difficulty });
      navigation.replace('Game', { matchId: match_id });
    } catch (err) {
      showToast('error', 'Could not start', errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <AppHeader title="vs Computer" subtitle="You are red. Bots take the other seats." />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard>
          <OptionPicker
            label="Players"
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
            options={[
              { label: 'Free for all', value: 'ffa' },
              { label: '2 vs 2', value: '2v2', disabled: players !== 4, hint: players !== 4 ? 'needs 4' : undefined },
            ]}
          />
          <OptionPicker
            label="Bot difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[{ label: '😊 Easy', value: 'easy' }, { label: '😈 Hard', value: 'hard' }]}
          />
          <OptionPicker
            label="Rules"
            value={ruleSetId}
            onChange={setRuleSetId}
            options={ruleSets.map((r) => ({ label: r.name, value: r.rule_set_id, hint: ruleSetHint(r) }))}
          />
          <Text style={styles.note}>Tip: "Demo" rules finish fast — only 1 token needs to reach home.</Text>
          <GameButton title="Start Game" icon={Play} variant="gold" loading={loading} onPress={start} />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  note: { color: colors.textMuted, fontSize: 12, marginBottom: 16 },
});
