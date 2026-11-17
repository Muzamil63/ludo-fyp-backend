// Create a tournament, or edit it (creator, before it starts): name, rules (preset or custom), size (up to 64),
// format, start time, time per round, and friends to invite straight away.
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trophy, CalendarClock, Save, FileText } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import GlassCard from '../../components/GlassCard';
import TextField from '../../components/TextField';
import OptionPicker from '../../components/OptionPicker';
import GameButton from '../../components/GameButton';
import RulePicker from '../../components/RulePicker';
import LoadingView from '../../components/LoadingView';
import { friendApi, tournamentApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { pickDateTime } from '../../utils/pickDateTime';
import { formatDateTime } from '../../utils/format';
import { rulesOf } from '../../utils/ruleText';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Friend, RuleChoice } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentForm'>;
const inMinutes = (m: number) => new Date(Date.now() + m * 60000);

export default function TournamentFormScreen({ navigation, route }: Props) {
  const editId = route.params?.tournamentId;
  const { showToast } = useNotify();
  const [loaded, setLoaded] = useState(!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<RuleChoice>({ rule_set_id: 1 }); // Classic (Customise to change)
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [perMatch, setPerMatch] = useState(2);
  const [startTime, setStartTime] = useState(inMinutes(15));
  const [breakMinutes, setBreakMinutes] = useState(10); // minutes per round (fixed schedule)
  const [join, setJoin] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invited, setInvited] = useState<number[]>([]); // friends to invite when the tournament is created

  useEffect(() => {
    if (!editId) {
      friendApi.list().then(setFriends).catch(() => {});
      return;
    }
    // Editing: fill the form with the current values
    tournamentApi
      .detail(editId)
      .then(({ tournament: t, rule_set }) => {
        setName(t.name);
        setDescription(t.description || '');
        setRules(rule_set?.is_custom ? { custom_rules: rulesOf(rule_set) } : { rule_set_id: t.rule_set_id });
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
      ...rules, // rule_set_id (a preset) or custom_rules
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
        // Invite the chosen friends (each gets a live alert and can accept from Invitations)
        const sent = await Promise.all(invited.map((id) => tournamentApi.invite(t.tournament_id, id).then(() => true, () => false)));
        const count = sent.filter(Boolean).length;
        showToast('success', 'Tournament created!', count ? `${count} friend${count > 1 ? 's' : ''} invited` : 'Now invite your friends');
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
            options={[2, 4, 8, 16, 32, 64].map((n) => ({ label: String(n), value: n }))} />
          <OptionPicker label="Match format" value={perMatch} onChange={setPerMatch}
            options={[{ label: '1 vs 1', value: 2, hint: 'classic knockout' }, { label: '4 players', value: 4, hint: 'winner advances' }]} />
          <Text style={styles.preview}>≈ {rounds} round{rounds > 1 ? 's' : ''} to crown a champion</Text>

          <RulePicker value={rules} onChange={setRules} />

          <Text style={styles.label}>Start time</Text>
          <GameButton title={formatDateTime(startTime)} icon={CalendarClock} variant="ghost" size="md" onPress={chooseTime} />
          <View style={styles.quick}>
            {[{ l: '+5 min', m: 5 }, { l: '+15 min', m: 15 }, { l: '+1 hour', m: 60 }, { l: 'Tomorrow', m: 24 * 60 }].map((q) => (
              <GameButton key={q.l} title={q.l} size="sm" variant="ghost" style={styles.quickBtn} onPress={() => setStartTime(inMinutes(q.m))} />
            ))}
          </View>

          <OptionPicker label="Time for each round" value={breakMinutes} onChange={setBreakMinutes}
            options={[5, 10, 15, 30].map((n) => ({ label: `${n} min`, value: n }))} />
          <Text style={styles.preview}>Round 2 starts {breakMinutes} min after round 1, and so on — or earlier when both players are ready.</Text>

          {!editId && (
            <OptionPicker label="Do you play too?" value={join} onChange={setJoin}
              options={[{ label: '🎮 Yes, I play', value: true }, { label: '👀 Only organise', value: false }]} />
          )}

          {!editId && friends.length > 0 && (
            <View style={styles.friendsBox}>
              <Text style={styles.label}>Invite friends ({invited.length} selected)</Text>
              <View style={styles.friendChips}>
                {friends.map((f) => {
                  const on = invited.includes(f.player_id);
                  return (
                    <Pressable key={f.player_id} style={[styles.friendChip, on && styles.friendChipOn]}
                      onPress={() => setInvited(on ? invited.filter((id) => id !== f.player_id) : [...invited, f.player_id])}>
                      <Text style={[styles.friendText, on && styles.friendTextOn]}>{on ? '✓ ' : ''}{f.display_name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
  friendsBox: { marginBottom: 18 },
  friendChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.cardBorder, backgroundColor: colors.card },
  friendChipOn: { borderColor: colors.gold, backgroundColor: 'rgba(255,201,60,0.16)' },
  friendText: { color: colors.textDim, fontWeight: '700' },
  friendTextOn: { color: colors.gold },
  preview: { color: colors.gold, fontSize: 13, fontWeight: '700', marginTop: -8, marginBottom: 16 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 18 },
  quickBtn: { flexGrow: 1 },
  error: { color: colors.danger, fontWeight: '700', marginBottom: 12 },
});
