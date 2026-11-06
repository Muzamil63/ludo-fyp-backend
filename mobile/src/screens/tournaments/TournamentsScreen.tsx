// Tournaments tab: browse open / live tournaments, my tournaments, and my upcoming tournament matches.
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import OptionPicker from '../../components/OptionPicker';
import TournamentCard from '../../components/TournamentCard';
import GlassCard from '../../components/GlassCard';
import GameButton from '../../components/GameButton';
import EmptyState from '../../components/EmptyState';
import StatusPill from '../../components/StatusPill';
import { tournamentApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useNow } from '../../hooks/useNow';
import { formatCountdown, formatTime } from '../../utils/format';
import { colors } from '../../theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import type { Tournament, UpcomingMatch } from '../../types';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Tournaments'>, NativeStackScreenProps<RootStackParamList>>;
type Tab = 'browse' | 'mine' | 'matches';

export default function TournamentsScreen({ navigation }: Props) {
  const { isGuest, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('browse');
  const [browse, setBrowse] = useState<Tournament[]>([]);
  const [mine, setMine] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    if (isGuest) return;
    try {
      const [all, my, upcoming] = await Promise.all([tournamentApi.list(), tournamentApi.mine(), tournamentApi.myMatches()]);
      setBrowse(all.filter((t) => t.status === 'registration' || t.status === 'in_progress'));
      setMine(my);
      setMatches(upcoming);
    } catch {
      // keep the old lists
    }
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  useSocketEvent('tournament:updated', () => load());
  useSocketEvent('tournament:match_ready', () => load());

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (isGuest) {
    return (
      <ScreenBackground safeBottom={false}>
        <AppHeader title="Tournaments" back={false} />
        <EmptyState
          emoji="🏆"
          title="Tournaments need an account"
          text="Create a free account to join knockout cups, invite friends and win trophies."
          actionLabel="Create Account"
          onAction={() =>
            Alert.alert('Leave guest mode?', 'You will go back to the start screen to create your account.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Continue', onPress: () => logout() },
            ])
          }
        />
      </ScreenBackground>
    );
  }

  const open = (id: number) => navigation.navigate('TournamentDetail', { tournamentId: id });

  return (
    <ScreenBackground safeBottom={false}>
      <AppHeader
        title="Tournaments"
        back={false}
        right={<GameButton title="Create" icon={Plus} size="sm" variant="gold" onPress={() => navigation.navigate('TournamentForm')} />}
      />
      <View style={styles.tabs}>
        <OptionPicker
          value={tab}
          onChange={setTab}
          options={[
            { label: 'Browse', value: 'browse' },
            { label: 'Mine', value: 'mine' },
            { label: `Matches${matches.length ? ` (${matches.length})` : ''}`, value: 'matches' },
          ]}
        />
      </View>

      {tab === 'matches' ? (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.match_id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
          ListEmptyComponent={<EmptyState emoji="📅" title="No upcoming matches" text="When a tournament you joined starts, your matches show up here." />}
          renderItem={({ item }) => {
            const left = new Date(item.scheduled_at).getTime() - now;
            return (
              <GlassCard style={styles.matchCard} highlight={item.status === 'in_progress' ? colors.danger : colors.gold} onPress={() => navigation.push('Game', { matchId: item.match_id })}>
                <View style={styles.matchTop}>
                  <Text style={styles.matchName} numberOfLines={1}>{item.tournament_name}</Text>
                  <StatusPill status={item.status} label={item.status === 'in_progress' ? 'Live' : undefined} />
                </View>
                <Text style={styles.matchRound}>Round {item.round_no} · Match {item.match_no}</Text>
                <Text style={styles.matchTime}>
                  {item.status === 'in_progress' ? 'Playing now — tap to join!' : left > 0 ? `Starts in ${formatCountdown(left)} (${formatTime(item.scheduled_at)})` : 'Starting now…'}
                </Text>
              </GlassCard>
            );
          }}
        />
      ) : (
        <FlatList
          data={tab === 'browse' ? browse : mine}
          keyExtractor={(t) => String(t.tournament_id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
          renderItem={({ item }) => <TournamentCard t={item} onPress={() => open(item.tournament_id)} />}
          ListEmptyComponent={
            <EmptyState
              emoji={tab === 'browse' ? '🎪' : '🎯'}
              title={tab === 'browse' ? 'No open tournaments' : 'No tournaments yet'}
              text={tab === 'browse' ? 'Be the first — create one and invite your friends!' : 'Join one from Browse, or create your own.'}
              actionLabel="Create Tournament"
              onAction={() => navigation.navigate('TournamentForm')}
            />
          }
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  matchCard: { marginBottom: 12 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchName: { color: colors.text, fontWeight: '900', fontSize: 16, flex: 1, marginRight: 8 },
  matchRound: { color: colors.gold, fontWeight: '800', marginTop: 6 },
  matchTime: { color: colors.textDim, marginTop: 4 },
});
