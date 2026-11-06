// End-of-match popup: winner banner + final ranking, with buttons to go home or back to the tournament.
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Home, Trophy } from 'lucide-react-native';
import GameButton from '../../components/GameButton';
import { colors, ludo, radius } from '../../theme';
import { ordinal } from '../../utils/format';
import type { Ranking, Seat } from '../../types';

const MEDALS = ['🥇', '🥈', '🥉', '🏅'];

interface Props {
  visible: boolean;
  rankings: Ranking[];
  seats: Seat[];
  myPlayerId?: number;
  isTournament: boolean;
  onHome: () => void;
  onTournament?: () => void;
}

export default function ResultModal({ visible, rankings, seats, myPlayerId, isTournament, onHome, onTournament }: Props) {
  const pop = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (visible) Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [visible, pop]);

  const mine = rankings.find((r) => r.player_id === myPlayerId);
  const won = mine?.finish_position === 1;
  const sorted = [...rankings].sort((a, b) => a.finish_position - b.finish_position);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={{ transform: [{ scale: pop }], width: '100%' }}>
          <LinearGradient colors={won ? ['#FFD86B', '#F29D00'] : ['#2B3375', '#1A2056']} style={styles.card}>
            <Text style={styles.big}>{won ? '🏆' : mine ? '🎲' : '🏁'}</Text>
            <Text style={[styles.title, won && styles.titleWon]}>
              {won ? (isTournament ? 'You win! Next round!' : 'Victory!') : mine ? `You finished ${ordinal(mine.finish_position)}` : 'Match over'}
            </Text>
            {isTournament && mine && !won && <Text style={styles.sub}>You are out of this tournament. Well played!</Text>}

            <View style={styles.list}>
              {sorted.map((r) => {
                const seat = seats.find((s) => s.seat_no === r.seat_no);
                const c = seat ? ludo[seat.color].main : colors.textDim;
                return (
                  <View key={r.seat_no} style={[styles.row, r.player_id === myPlayerId && styles.rowMe]}>
                    <Text style={styles.medal}>{MEDALS[r.finish_position - 1] || '•'}</Text>
                    <View style={[styles.dot, { backgroundColor: c }]} />
                    <Text style={styles.name} numberOfLines={1}>
                      {r.display_name}
                      {r.player_id === myPlayerId ? ' (You)' : ''}
                      {r.bot_id ? ' 🤖' : ''}
                    </Text>
                    <Text style={styles.place}>{ordinal(r.finish_position)}</Text>
                  </View>
                );
              })}
            </View>

            {isTournament && onTournament && <GameButton title="View Tournament" icon={Trophy} variant={won ? 'primary' : 'gold'} onPress={onTournament} style={styles.btn} />}
            <GameButton title="Home" icon={Home} variant="ghost" onPress={onHome} style={styles.btn} />
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,8,25,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderRadius: radius.xl, padding: 22, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  big: { fontSize: 64 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  titleWon: { color: '#3A2000' },
  sub: { color: colors.textDim, marginTop: 4, textAlign: 'center' },
  list: { alignSelf: 'stretch', marginVertical: 18 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: radius.md, padding: 10, marginBottom: 8 },
  rowMe: { borderWidth: 2, borderColor: '#fff' },
  medal: { fontSize: 22, width: 34 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  name: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  place: { color: '#fff', fontWeight: '900' },
  btn: { alignSelf: 'stretch', marginTop: 10 },
});
