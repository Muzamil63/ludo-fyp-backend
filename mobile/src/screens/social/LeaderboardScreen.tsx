// Top 20 registered players by wins, with a podium for the top three.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import Avatar from '../../components/Avatar';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import { userApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

type Row = Awaited<ReturnType<typeof userApi.leaderboard>>[number];
const MEDAL_COLORS = ['#FFC93C', '#C9D1E8', '#E39A5B'];

export default function LeaderboardScreen() {
  const { player } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    userApi.leaderboard().then(setRows).catch(() => setRows([]));
  }, []);

  if (!rows) {
    return (
      <ScreenBackground>
        <AppHeader title="Leaderboard" />
        <LoadingView />
      </ScreenBackground>
    );
  }

  const podium = [rows[1], rows[0], rows[2]]; // 2nd, 1st, 3rd

  return (
    <ScreenBackground>
      <AppHeader title="Leaderboard" subtitle="Most wins" />
      <ScrollView contentContainerStyle={styles.content}>
        {rows.length === 0 ? (
          <EmptyState emoji="👑" title="No champions yet" text="Win a match to get on the board!" />
        ) : (
          <>
            <View style={styles.podium}>
              {podium.map((r, i) => {
                if (!r) return <View key={i} style={styles.podiumCol} />;
                const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <View key={r.player_id} style={styles.podiumCol}>
                    <Text style={styles.crown}>{place === 1 ? '👑' : ' '}</Text>
                    <Avatar avatar={r.avatar} name={r.display_name} size={place === 1 ? 70 : 54} ring={MEDAL_COLORS[place - 1]} />
                    <Text style={styles.podiumName} numberOfLines={1}>{r.display_name}</Text>
                    <View style={[styles.block, { height: place === 1 ? 90 : place === 2 ? 66 : 50, backgroundColor: MEDAL_COLORS[place - 1] }]}>
                      <Text style={styles.blockText}>{place}</Text>
                      <Text style={styles.blockWins}>{r.games_won} wins</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            {rows.map((r, i) => (
              <View key={r.player_id} style={[styles.row, r.player_id === player?.player_id && styles.rowMe]}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Avatar avatar={r.avatar} name={r.display_name} size={36} />
                <View style={styles.texts}>
                  <Text style={styles.name}>{r.display_name}</Text>
                  <Text style={styles.user}>@{r.username} · {r.games_played} played</Text>
                </View>
                <Text style={styles.wins}>{r.games_won}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  podiumCol: { flex: 1, alignItems: 'center' },
  crown: { fontSize: 26 },
  podiumName: { color: colors.text, fontWeight: '800', marginTop: 6, marginBottom: 6, maxWidth: 100 },
  block: { width: '88%', borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', justifyContent: 'center' },
  blockText: { color: '#2A1B00', fontWeight: '900', fontSize: 26 },
  blockWins: { color: '#2A1B00', fontWeight: '800', fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 8 },
  rowMe: { borderWidth: 1.5, borderColor: colors.gold },
  rank: { color: colors.textDim, fontWeight: '900', width: 28, fontSize: 16 },
  texts: { flex: 1, marginLeft: 12 },
  name: { color: colors.text, fontWeight: '800' },
  user: { color: colors.textMuted, fontSize: 12 },
  wins: { color: colors.gold, fontWeight: '900', fontSize: 20 },
});
