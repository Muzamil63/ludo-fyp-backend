// Profile tab: avatar + name (editable), stats, recent matches, leaderboard, server settings, log out.
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Crown, LogOut, Pencil, Server, Save } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import Avatar from '../../components/Avatar';
import GlassCard from '../../components/GlassCard';
import GameButton from '../../components/GameButton';
import BottomSheet from '../../components/BottomSheet';
import TextField from '../../components/TextField';
import { userApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { formatDateTime, matchTypeLabel, ordinal } from '../../utils/format';
import { AVATARS, colors, ludo } from '../../theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import type { HistoryMatch } from '../../types';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;

export default function ProfileScreen({ navigation }: Props) {
  const { player, isGuest, refreshMe, logout } = useAuth();
  const { showToast } = useNotify();
  const [history, setHistory] = useState<HistoryMatch[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(player?.display_name || '');
  const [avatar, setAvatar] = useState(player?.avatar || AVATARS[0]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
      userApi.myMatches().then(setHistory).catch(() => {});
    }, [refreshMe])
  );

  async function save() {
    setSaving(true);
    try {
      await userApi.updateMe({ display_name: name.trim(), avatar });
      await refreshMe();
      setEditOpen(false);
      showToast('success', 'Profile updated');
    } catch (err) {
      showToast('error', errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const played = player?.games_played ?? 0;
  const won = player?.games_won ?? 0;

  return (
    <ScreenBackground safeBottom={false}>
      <AppHeader title="Profile" back={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.top}>
          <Avatar avatar={player?.avatar} name={player?.display_name} size={84} ring={colors.gold} />
          <Text style={styles.name}>{player?.display_name}</Text>
          <Text style={styles.user}>{isGuest ? 'Guest player' : `@${player?.username}`}</Text>
          <GameButton
            title="Edit profile"
            icon={Pencil}
            size="sm"
            variant="ghost"
            style={styles.edit}
            onPress={() => {
              setName(player?.display_name || '');
              setAvatar(player?.avatar || AVATARS[0]);
              setEditOpen(true);
            }}
          />
        </GlassCard>

        {!isGuest && (
          <View style={styles.stats}>
            {[
              { v: played, l: 'Played' },
              { v: won, l: 'Won' },
              { v: `${played ? Math.round((won / played) * 100) : 0}%`, l: 'Win rate' },
              { v: player?.tournaments_won ?? 0, l: '🏆 Cups' },
            ].map((s) => (
              <View key={s.l} style={styles.stat}>
                <Text style={styles.statValue}>{s.v}</Text>
                <Text style={styles.statLabel}>{s.l}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.section}>Recent matches</Text>
        {history.length === 0 && <Text style={styles.none}>No finished matches yet — go play!</Text>}
        {history.slice(0, 10).map((m) => (
          <View key={m.match_id} style={styles.history}>
            <View style={[styles.dot, { backgroundColor: ludo[m.color]?.main || colors.textDim }]} />
            <View style={styles.historyText}>
              <Text style={styles.historyTitle}>{matchTypeLabel[m.match_type] || m.match_type}</Text>
              <Text style={styles.historyDate}>{formatDateTime(m.ended_at)}</Text>
            </View>
            <Text style={[styles.place, m.finish_position === 1 && styles.win]}>{m.finish_position === 1 ? '🏆 Won' : m.finish_position ? ordinal(m.finish_position) : '-'}</Text>
          </View>
        ))}

        <GlassCard style={styles.menu} onPress={() => navigation.navigate('Leaderboard')}>
          <View style={styles.menuRow}>
            <Crown color={colors.gold} size={22} />
            <Text style={styles.menuText}>Leaderboard</Text>
          </View>
        </GlassCard>
        <GlassCard style={styles.menu} onPress={() => navigation.navigate('ServerSettings')}>
          <View style={styles.menuRow}>
            <Server color={colors.info} size={22} />
            <Text style={styles.menuText}>Server settings</Text>
          </View>
        </GlassCard>
        <GameButton
          title="Log Out"
          icon={LogOut}
          variant="danger"
          size="md"
          style={styles.logout}
          onPress={() =>
            Alert.alert('Log out?', isGuest ? 'You can come back as the same guest on this phone.' : 'See you soon!', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: () => logout() },
            ])
          }
        />
      </ScrollView>

      <BottomSheet visible={editOpen} title="Edit profile" onClose={() => setEditOpen(false)}>
        <Text style={styles.pickLabel}>Pick an avatar</Text>
        <View style={styles.avatars}>
          {AVATARS.map((a) => (
            <Pressable key={a} onPress={() => setAvatar(a)} style={[styles.avatarChoice, a === avatar && styles.avatarSelected]}>
              <Text style={styles.avatarEmoji}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <TextField label="Display name" value={name} onChangeText={setName} maxLength={50} />
        <GameButton title="Save" icon={Save} variant="gold" loading={saving} onPress={save} disabled={!name.trim()} />
      </BottomSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  top: { alignItems: 'center' },
  name: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 10 },
  user: { color: colors.textDim, marginTop: 2 },
  edit: { marginTop: 12, minWidth: 160 },
  stats: { flexDirection: 'row', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingVertical: 14, borderWidth: 1, borderColor: colors.cardBorder },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textDim, fontSize: 11, marginTop: 2, fontWeight: '700' },
  section: { color: colors.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 22, marginBottom: 8 },
  none: { color: colors.textMuted, marginBottom: 8 },
  history: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  historyText: { flex: 1, marginLeft: 12 },
  historyTitle: { color: colors.text, fontWeight: '800' },
  historyDate: { color: colors.textMuted, fontSize: 12 },
  place: { color: colors.textDim, fontWeight: '900' },
  win: { color: colors.gold },
  menu: { marginTop: 12, paddingVertical: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  menuText: { color: colors.text, fontWeight: '800', fontSize: 16, marginLeft: 12 },
  logout: { marginTop: 20 },
  pickLabel: { color: colors.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  avatarChoice: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarSelected: { borderColor: colors.gold, backgroundColor: 'rgba(255,201,60,0.18)' },
  avatarEmoji: { fontSize: 28 },
});
