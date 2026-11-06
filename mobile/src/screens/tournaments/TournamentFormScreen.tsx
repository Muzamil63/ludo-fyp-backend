// Create a tournament, or edit it (creator, before it starts): name, rules, size, format, start time, breaks.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trophy, CalendarClock, Save, FileText } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import OptionPicker from '../../components/OptionPicker';
import GameButton from '../../components/GameButton';
import LoadingView from '../../components/LoadingView';
import { matchApi, tournamentApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { pickDateTime } from '../../utils/pickDateTime';
import { formatDateTime } from '../../utils/format';
import { ruleSetHint } from '../game/BotSetupScreen';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { RuleSet } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentForm'>;
const inMinutes = (m: number) => new Date(Date.now() + m * 60000);

export default function TournamentFormScreen({ navigation, route }: Props) {
  const editId = route.params?.tournamentId;
  const { showToast } = useNotify();
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [loaded, setLoaded] = useState(!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleSetId, setRuleSetId] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [perMatch, setPerMatch] = useState(2);
  const [startTime, setStartTime] = useState(inMinutes(15));
  const [breakMinutes, setBreakMinutes] = useState(2);
  const [join, setJoin] = useState(true);

  useEffect(() => {
    matchApi.ruleSets().then(setRuleSets).catch(() => {});
    if (!editId) return;
    // Editing: fill the form with the current values
    tournamentApi
      .detail(editId)
      .then(({ tournament: t }) => {
        setName(t.name);
        setDescription(t.description || '');
        setRuleSetId(t.rule_set_id);
        setMaxPlayers(t.max_participants);
        setPerMatch(t.players_per_match);
        setStartTime(new Date(t.start_time));
        setBreakMinutes(t.round_break_minutes);
        setLoaded(true);
      })
      .catch((err) => {
        showToast('error', 'Could not load tournament', errorMessage(err));
        navigation.goBack();
      });
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function chooseTime() {
    const picked = await pickDateTime(startTime > new Date() ? startTime : inMinutes(15));
    if (picked) setStartTime(picked);
  }

  async function save() {
    if (!name.trim()) return setError('Give your tournament a name');
    if (startTime.getTime() <= Date.now()) return setError('The start time must be in the future');
    setError('');
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      rule_set_id: ruleSetId,
      max_participants: maxPlayers,
      players_per_match: perMatch,
      start_time: startTime.toISOString(),
      round_break_minutes: breakMinutes,
    };
    try {
      if (editId) {
        await tournamentApi.update(editId, body);
        showToast('success', 'Tournament updated', 'Players were notified');
        navigation.goBack();
      } else {
        const t = await tournamentApi.create({ ...body, join });
        showToast('success', 'Tournament created!', 'Now invite your friends');
        navigation.replace('TournamentDetail', { tournamentId: t.tournament_id });
      }
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <ScreenBackground>
        <AppHeader title="Edit Tournament" />
        <LoadingView />
      </ScreenBackground>
    );
  }

  const rounds = Math.ceil(Math.log(maxPlayers) / Math.log(perMatch));

  return (
    <ScreenBackground>
      <AppHeader title={editId ? 'Edit Tournament' : 'New Tournament'} subtitle={editId ? 'Changes are sent to all players' : 'You are the organiser'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GlassCard>
          <TextField label="Name" icon={Trophy} value={name} onChangeText={setName} placeholder="Friday Night Cup" maxLength={100} />
          <TextField label="Description (optional)" icon={FileText} value={description} onChangeText={setDescription} placeholder="Prize, rules, anything…" maxLength={255} />

          <OptionPicker label="Players" value={maxPlayers} onChange={setMaxPlayers}
            options={[2, 4, 8, 16].map((n) => ({ label: String(n), value: n }))} />
          <OptionPicker label="Match format" value={perMatch} onChange={setPerMatch}
            options={[{ label: '1 vs 1', value: 2, hint: 'classic knockout' }, { label: '4 players', value: 4, hint: 'winner advances' }]} />
          <Text style={styles.preview}>≈ {rounds} round{rounds > 1 ? 's' : ''} to crown a champion</Text>

          <OptionPicker label="Rules" value={ruleSetId} onChange={setRuleSetId}
            options={ruleSets.map((r) => ({ label: r.name, value: r.rule_set_id, hint: ruleSetHint(r) }))} />

          <Text style={styles.label}>Start time</Text>
          <GameButton title={formatDateTime(startTime)} icon={CalendarClock} variant="ghost" size="md" onPress={chooseTime} />
          <View style={styles.quick}>
            {[{ l: '+5 min', m: 5 }, { l: '+15 min', m: 15 }, { l: '+1 hour', m: 60 }, { l: 'Tomorrow', m: 24 * 60 }].map((q) => (
              <GameButton key={q.l} title={q.l} size="sm" variant="ghost" style={styles.quickBtn} onPress={() => setStartTime(inMinutes(q.m))} />
            ))}
          </View>

          <OptionPicker label="Break between rounds" value={breakMinutes} onChange={setBreakMinutes}
            options={[1, 2, 5, 10].map((n) => ({ label: `${n} min`, value: n }))} />

          {!editId && (
            <OptionPicker label="Do you play too?" value={join} onChange={setJoin}
              options={[{ label: '🎮 Yes, I play', value: true }, { label: '👀 Only organise', value: false }]} />
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          <GameButton title={editId ? 'Save Changes' : 'Create Tournament'} icon={Save} variant="gold" loading={saving} onPress={save} />
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  preview: { color: colors.gold, fontSize: 13, fontWeight: '700', marginTop: -8, marginBottom: 16 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 18 },
  quickBtn: { flexGrow: 1 },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 12 },
});
