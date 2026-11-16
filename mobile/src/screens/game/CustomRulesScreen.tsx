// "Custom rules" page: the player sets every rule for one game (or tournament), then taps "Use these rules".
// Opened from the Rules picker on vs Computer, Create Room and the tournament form (see utils/customRulesPage.ts).
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, RotateCcw } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import OptionPicker from '../../components/OptionPicker';
import GameButton from '../../components/GameButton';
import { finishCustomRules } from '../../utils/customRulesPage';
import { CLASSIC_RULES, ruleSummary } from '../../utils/ruleText';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { CustomRules } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomRules'>;
const ON_OFF = [{ label: 'On', value: 1 }, { label: 'Off', value: 0 }];

export default function CustomRulesScreen({ navigation, route }: Props) {
  const [rules, setRules] = useState<CustomRules>(route.params.initial);
  const saved = useRef(false);

  // Leaving without "Use these rules" (back button / gesture) keeps the old choice
  useEffect(() => () => {
    if (!saved.current) finishCustomRules(null);
  }, []);

  const set = (field: keyof CustomRules) => (value: number) => setRules((r) => ({ ...r, [field]: value }));

  function saveRules() {
    saved.current = true;
    finishCustomRules(rules);
    navigation.goBack();
  }

  return (
    <ScreenBackground>
      <AppHeader title="Custom rules" subtitle="Set every rule for this game" />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard>
          <Text style={styles.section}>Start & finish</Text>
          <OptionPicker label="A token leaves the base on" value={rules.six_to_unlock} onChange={set('six_to_unlock')}
            options={[{ label: 'A 6 only', value: 1 }, { label: 'A 1 or a 6', value: 0 }]} />
          <OptionPicker label="Tokens home to win" value={rules.tokens_to_win} onChange={set('tokens_to_win')}
            options={[1, 2, 3, 4].map((n) => ({ label: String(n), value: n }))} />
          <OptionPicker label="Time per turn" value={rules.turn_seconds} onChange={set('turn_seconds')}
            options={[10, 20, 30, 60].map((s) => ({ label: `${s}s`, value: s }))} />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.section}>Captures & extra turns</Text>
          <OptionPicker label="Capturing" value={rules.capture_enabled} onChange={set('capture_enabled')} options={ON_OFF} />
          <OptionPicker label="Extra turn on a 6" value={rules.extra_turn_on_six} onChange={set('extra_turn_on_six')} options={ON_OFF} />
          <OptionPicker label="Extra turn after a capture" value={rules.extra_turn_on_capture} onChange={set('extra_turn_on_capture')} options={ON_OFF} />
          <OptionPicker label="Extra turn when a token gets home" value={rules.extra_turn_on_home} onChange={set('extra_turn_on_home')} options={ON_OFF} />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.section}>Dice help</Text>
          <OptionPicker label="Tries for a 6 while all tokens are in base" value={rules.tries_when_all_home} onChange={set('tries_when_all_home')}
            options={[1, 3, 5].map((n) => ({ label: String(n), value: n }))} />
          <OptionPicker label="Lucky-6 help (no very long waits for a 6)" value={rules.six_boost_after ? 1 : 0}
            onChange={(v) => set('six_boost_after')(v ? 6 : 0)} options={ON_OFF} />
        </GlassCard>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>YOUR RULES</Text>
          <Text style={styles.summary}>{ruleSummary(rules)}</Text>
        </View>
        <GameButton title="Use these rules" icon={Check} variant="gold" onPress={saveRules} />
        <GameButton title="Reset to Classic" icon={RotateCcw} variant="ghost" size="md" onPress={() => setRules(CLASSIC_RULES)} style={styles.card} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  card: { marginTop: 14 },
  section: { color: colors.gold, fontWeight: '900', fontSize: 16, marginBottom: 14 },
  summaryBox: { marginVertical: 18, alignItems: 'center' },
  summaryLabel: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  summary: { color: colors.gold, fontWeight: '800', fontSize: 14, marginTop: 6, textAlign: 'center' },
});
