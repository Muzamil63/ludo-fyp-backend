// Home: player header with invites bell, quick play, all game modes, next tournament match, stats.
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { Bell, Bot, Globe, KeyRound, Trophy, Users, Crown, Swords } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import Avatar from '../../components/Avatar';
import TokenPiece from '../../components/TokenPiece';
import GlassCard from '../../components/GlassCard';
import BottomSheet from '../../components/BottomSheet';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { tournamentApi } from '../../api/endpoints';
import { useNow } from '../../hooks/useNow';
import { formatCountdown } from '../../utils/format';
import { colors, gradients, radius } from '../../theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import type { UpcomingMatch } from '../../types';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Home'>, NativeStackScreenProps<RootStackParamList>>;
type IconType = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

function ModeTile({ title, subtitle, icon: Icon, colorsPair, onPress, locked }: {
  title: string; subtitle: string; icon: IconType; colorsPair: string[]; onPress: () => void; locked?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.tileWrap, { opacity: pressed ? 0.85 : 1 }]} onPress={onPress}>
      <LinearGradient colors={colorsPair} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <View style={styles.tileIcon}>
          <Icon color="#fff" size={26} strokeWidth={2.4} />
        </View>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{locked ? '🔒 Account needed' : subtitle}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { player, isGuest, refreshMe } = useAuth();
  const { inviteCount, refreshInviteCount, showToast } = useNotify();
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
  const now = useNow();

  // Refresh stats, invites and my tournament matches every time Home is shown
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
      refreshInviteCount();
      if (!isGuest) tournamentApi.myMatches().then(setUpcoming).catch(() => {});
    }, [refreshMe, refreshInviteCount, isGuest])
  );

  const needAccount = (what: string) => showToast('info', 'Create an account', `${what} need a registered account.`);
  const played = player?.games_played ?? 0;
  const won = player?.games_won ?? 0;
  const next = upcoming[0];

  return (
    <ScreenBackground safeBottom={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <Avatar avatar={player?.avatar} name={player?.display_name} size={46} ring={colors.gold} />
          <View style={styles.headerText}>
            <Text style={styles.hello}>Hello,</Text>
            <Text style={styles.name} numberOfLines={1}>{player?.display_name}</Text>
          </View>
          {!isGuest && (
            <Pressable style={styles.bell} onPress={() => navigation.navigate('Invites')}>
              <Bell color={colors.text} size={22} />
              {inviteCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{inviteCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* next tournament match */}
        {next && (
          <GlassCard style={styles.nextCard} highlight={colors.gold} onPress={() => navigation.push('Game', { matchId: next.match_id })}>
            <Text style={styles.nextLabel}>🏆 {next.tournament_name} · Round {next.round_no}</Text>
            <Text style={styles.nextTitle}>
              {next.status === 'in_progress' ? 'Your match is LIVE — tap to play!' : `Your match starts in ${formatCountdown(new Date(next.scheduled_at).getTime() - now)}`}
            </Text>
            <Text style={styles.nextHint}>Join the lobby early: it starts as soon as everyone is there.</Text>
          </GlassCard>
        )}

        {/* quick play hero */}
        <Pressable onPress={() => setOnlineOpen(true)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
          <LinearGradient colors={['#7C5CFF', '#4B2BD6', '#2A1680']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTokens}>
              <TokenPiece color="red" size={46} />
              <TokenPiece color="green" size={46} />
              <TokenPiece color="yellow" size={46} />
              <TokenPiece color="blue" size={46} />
            </View>
            <Text style={styles.heroTitle}>PLAY ONLINE</Text>
            <Text style={styles.heroSub}>Get matched with real players in seconds</Text>
            <View style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>PLAY NOW</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* modes */}
        <Text style={styles.section}>Game modes</Text>
        <View style={styles.grid}>
          <ModeTile title="vs Computer" subtitle="Practice with bots" icon={Bot} colorsPair={gradients.green} onPress={() => navigation.navigate('BotSetup')} />
          <ModeTile title="Tournaments" subtitle="Knockout cups" icon={Trophy} colorsPair={gradients.gold} locked={isGuest}
            onPress={() => (isGuest ? needAccount('Tournaments') : navigation.navigate('Main', { screen: 'Tournaments' }))} />
          <ModeTile title="Create Room" subtitle="Play with friends" icon={Users} colorsPair={gradients.blue} locked={isGuest}
            onPress={() => (isGuest ? needAccount('Private rooms') : navigation.navigate('CreateRoom'))} />
          <ModeTile title="Join Room" subtitle="Enter a room code" icon={KeyRound} colorsPair={gradients.red} onPress={() => navigation.navigate('JoinRoom')} />
        </View>

        <GlassCard style={styles.leaderCard} onPress={() => navigation.navigate('Leaderboard')}>
          <Crown color={colors.gold} size={26} />
          <View style={styles.leaderText}>
            <Text style={styles.leaderTitle}>Leaderboard</Text>
            <Text style={styles.leaderSub}>See the best players</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </GlassCard>

        {/* stats */}
        {!isGuest && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{played}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{won}</Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{played ? Math.round((won / played) * 100) : 0}%</Text>
              <Text style={styles.statLabel}>Win rate</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{player?.tournaments_won ?? 0}</Text>
              <Text style={styles.statLabel}>Trophies</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={onlineOpen} title="Play Online" onClose={() => setOnlineOpen(false)}>
        {[
          { key: 'ffa2' as const, title: '1 vs 1', sub: '2 players, classic rules', icon: Swords },
          { key: 'ffa4' as const, title: '4 Players', sub: 'Everyone for themselves', icon: Globe },
          { key: '2v2' as const, title: '2 vs 2 Teams', sub: 'Play with a partner', icon: Users },
        ].map((m) => (
          <GlassCard
            key={m.key}
            style={styles.queueCard}
            onPress={() => {
              setOnlineOpen(false);
              navigation.navigate('Matchmaking', { queueKey: m.key });
            }}
          >
            <m.icon color={colors.gold} size={26} />
            <View style={styles.leaderText}>
              <Text style={styles.leaderTitle}>{m.title}</Text>
              <Text style={styles.leaderSub}>{m.sub}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </GlassCard>
        ))}
      </BottomSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  headerText: { flex: 1, marginLeft: 12 },
  hello: { color: colors.textDim, fontSize: 13 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  bell: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  nextCard: { marginBottom: 16 },
  nextLabel: { color: colors.gold, fontWeight: '800', fontSize: 13 },
  nextTitle: { color: colors.text, fontWeight: '900', fontSize: 17, marginTop: 4 },
  nextHint: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  hero: { borderRadius: radius.xl, padding: 22, alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  heroTokens: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  heroBtn: { marginTop: 16, backgroundColor: colors.gold, borderRadius: radius.round, paddingHorizontal: 34, paddingVertical: 12 },
  heroBtnText: { color: '#3A2600', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tileWrap: { width: '48.5%', marginBottom: 12 },
  tile: { borderRadius: radius.lg, padding: 16, minHeight: 130, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tileIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileTitle: { color: '#fff', fontSize: 17, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 4 },
  tileSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  leaderCard: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  queueCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  leaderText: { flex: 1, marginLeft: 14 },
  leaderTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  leaderSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  arrow: { color: colors.textDim, fontSize: 28, fontWeight: '300' },
  stats: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: colors.cardBorder },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.textDim, fontSize: 11, marginTop: 2, fontWeight: '700' },
});
