// Full-screen bracket map of a tournament: every round from round 1 to the final. Updates live as matches
// finish; tap your own open match to play it.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import LoadingView from '../../components/LoadingView';
import BracketTree from '../../components/BracketTree';
import { tournamentApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { TournamentDetail } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Bracket'>;

export default function BracketScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const { player } = useAuth();
  const { showToast } = useNotify();
  const [data, setData] = useState<TournamentDetail | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await tournamentApi.detail(tournamentId));
    } catch (err) {
      showToast('error', 'Could not load the bracket', errorMessage(err));
    }
  }, [tournamentId, showToast]);

  useEffect(() => {
    load();
  }, [load]);
  // Redraw when a match starts / ends or the next round is drawn
  useSocketEvent('tournament:updated', (d: { tournament_id: number }) => d.tournament_id === tournamentId && load());

  if (!data) {
    return (
      <ScreenBackground>
        <AppHeader title="Bracket" />
        <LoadingView message="Loading bracket…" />
      </ScreenBackground>
    );
  }

  const { tournament: t, rounds, preview, participants } = data;
  const matchCount = rounds.reduce((n, r) => n + r.matches.length, 0);
  const subtitle = preview
    ? `${t.name} · preview for ${t.max_participants} players`
    : `${t.name} · ${participants.length} players · ${rounds.length} rounds · ${matchCount} matches`;

  return (
    <ScreenBackground>
      <AppHeader title="Bracket" subtitle={subtitle} />
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {preview ? 'Round 1 is drawn when the tournament starts. ' : ''}Winners move right → 👑 champion.{' '}
          <Text style={styles.gold}>Gold</Text> = your matches.
        </Text>
      </View>
      {rounds.length > 0 ? (
        <BracketTree rounds={rounds} myPlayerId={player?.player_id} preview={preview} onOpenMatch={(matchId) => navigation.push('Game', { matchId })} />
      ) : (
        <Text style={styles.empty}>No bracket: this tournament was cancelled before it started.</Text>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  legend: { paddingHorizontal: 16, paddingBottom: 4 },
  legendText: { color: colors.textDim, fontSize: 12.5, lineHeight: 18 },
  gold: { color: colors.gold, fontWeight: '800' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
