// Rules for a new game: Classic by default. "Customise" opens the Custom rules page, where any rule can change.
// Used by vs Computer, Create Room and the tournament form. The value is sent to the server as it is.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Settings2 } from 'lucide-react-native';
import { matchApi } from '../api/endpoints';
import { editCustomRules } from '../utils/customRulesPage';
import { CLASSIC_RULES, ruleSummary, rulesOf, sameRules } from '../utils/ruleText';
import { colors, radius } from '../theme';
import type { RuleChoice, RuleSet } from '../types';

const CLASSIC_ID = 1; // the Classic row in rule_sets

interface Props {
  value: RuleChoice;
  onChange: (choice: RuleChoice) => void;
}

export default function RulePicker({ value, onChange }: Props) {
  const [presets, setPresets] = useState<RuleSet[]>([]);
  useEffect(() => {
    matchApi.ruleSets().then(setPresets).catch(() => {});
  }, []);

  // Classic's values come from the server (so a changed Classic row shows right), with a local fallback
  const classicRow = presets.find((p) => p.rule_set_id === CLASSIC_ID);
  const classic = classicRow ? rulesOf(classicRow) : CLASSIC_RULES;
  const custom = 'custom_rules' in value ? value.custom_rules : null;
  const preset = 'rule_set_id' in value ? presets.find((p) => p.rule_set_id === value.rule_set_id) : undefined;
  const shown = custom ?? (preset ? rulesOf(preset) : classic);

  // Opens the Custom rules page with the current rules. Rules equal to Classic simply use the Classic preset.
  async function customise() {
    const rules = await editCustomRules(shown);
    if (rules) onChange(sameRules(rules, classic) ? { rule_set_id: CLASSIC_ID } : { custom_rules: rules });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Rules</Text>
      <Pressable style={[styles.card, !!custom && styles.cardCustom]} onPress={customise}>
        <View style={styles.text}>
          <Text style={[styles.title, !!custom && styles.titleCustom]}>
            {custom ? '⚙️ Custom rules' : `📜 ${preset?.name ?? 'Classic'} rules`}
          </Text>
          <Text style={styles.summary}>{ruleSummary(shown)}</Text>
        </View>
        <View style={styles.edit}>
          <Settings2 color={colors.gold} size={16} />
          <Text style={styles.editText}>{custom ? 'Edit' : 'Customise'}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  cardCustom: { borderColor: colors.gold, backgroundColor: 'rgba(255,201,60,0.10)' },
  text: { flex: 1 },
  title: { color: colors.text, fontWeight: '900', fontSize: 15 },
  titleCustom: { color: colors.gold },
  summary: { color: colors.textDim, fontSize: 12, marginTop: 4, lineHeight: 17 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 },
  editText: { color: colors.gold, fontWeight: '800' },
});
