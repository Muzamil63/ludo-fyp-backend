// The Ludo match screen. Joins the match over Socket.IO, shows board / dice / players, sends "roll" and
// "move" to the server and updates the board from the server's events (the server decides everything).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, Vibration, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import LudoBoard from '../../components/LudoBoard';
import Dice from '../../components/Dice';
import PlayerPanel from '../../components/PlayerPanel';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import ResultModal from './ResultModal';
import TournamentLobby from './TournamentLobby';
import { emitAck } from '../../api/socket';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { movableTokenIds } from '../../game/rules';
import { colors, ludo, LudoColor } from '../../theme';
import { matchTypeLabel } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import type { MatchState, Ranking, Seat } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;
const CLOCKWISE: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

const rankingsFromSeats = (seats: Seat[]): Ranking[] =>
  seats
    .filter((s) => s.finish_position)
    .map((s) => ({ seat_no: s.seat_no, player_id: s.player_id, bot_id: s.bot_id, display_name: s.display_name, finish_position: s.finish_position! }));

export default function GameScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const { player, socketConnected } = useAuth();
  const { showToast, setActiveMatch } = useNotify();
  const { width } = useWindowDimensions();

  const [state, setState] = useState<MatchState | null>(null);
  const [error, setError] = useState('');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [movable, setMovable] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<number | null>(null);
  const [lastRolls, setLastRolls] = useState<Record<number, number>>({});
  const [rankings, setRankings] = useState<Ranking[] | null>(null);
  const [present, setPresent] = useState<number[]>([]);
  const rollStart = useRef(0);
  const rollingRef = useRef(false);

  const match = state?.match;
  const mySeat = state?.seats.find((s) => s.player_id === player?.player_id);
  const isMyTurn = match?.status === 'in_progress' && !!mySeat && match.current_seat === mySeat.seat_no;
  const canRoll = isMyTurn && match?.dice_value === null && !rolling && movable.length === 0;
  const finished = match?.status === 'finished' || match?.status === 'cancelled';

  // ---------- load / reload the full match ----------
  const applyState = useCallback((s: MatchState) => {
    setState(s);
    setDeadline(s.turn_deadline);
    if (s.match.status === 'finished') setRankings(rankingsFromSeats(s.seats));
    // After a reconnect it may be my turn with the dice already rolled: show my movable tokens again.
    const me = s.seats.find((x) => x.player_id === player?.player_id);
    if (me && s.match.current_seat === me.seat_no && s.match.dice_value) {
      setMovable(movableTokenIds(s.tokens.filter((t) => t.seat_no === me.seat_no), s.match.dice_value, s.match.rule_set));
      setDice(s.match.dice_value);
    }
  }, [player?.player_id]);

  const join = useCallback(async () => {
    try {
      applyState(await emitAck<MatchState>('match:join', { match_id: matchId }));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [matchId, applyState]);

  // Join when the socket is connected (also re-joins after a reconnect). Leave the room on close.
  useEffect(() => {
    if (socketConnected) join();
  }, [socketConnected, join]);

  useEffect(() => {
    setActiveMatch(matchId);
    return () => {
      setActiveMatch(null);
      emitAck('match:leave', { match_id: matchId }).catch(() => {});
    };
  }, [matchId, setActiveMatch]);

  // Ask before leaving a running match (Android back button or header back)
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!match || match.status !== 'in_progress' || !mySeat) return;
      e.preventDefault();
      Alert.alert('Leave the match?', 'The match goes on without you — the server will play your turns automatically.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [navigation, match, mySeat]);

  // ---------- server events ----------
  const forThisMatch = (d: { match_id?: number }) => d.match_id === matchId;

  useSocketEvent('match:state', (d: MatchState & { match_id: number }) => {
    if (forThisMatch(d)) applyState(d);
  });

  useSocketEvent('game:turn', (d: { match_id: number; seat_no: number; deadline: number | null }) => {
    if (!forThisMatch(d)) return;
    setState((s) => s && { ...s, match: { ...s.match, current_seat: d.seat_no, dice_value: null } });
    setDeadline(d.deadline);
    setMovable([]);
    if (mySeat && d.seat_no === mySeat.seat_no) Vibration.vibrate(40);
  });

  useSocketEvent('game:rolled', (d: { match_id: number; seat_no: number; dice_value: number; valid_token_ids: number[] }) => {
    if (!forThisMatch(d)) return;
    const mine = !!mySeat && d.seat_no === mySeat.seat_no;
    if (!rollingRef.current) {
      rollStart.current = Date.now();
      rollingRef.current = true;
      setRolling(true);
    }
    // Let the dice spin for at least ~0.6 s so everyone sees the roll
    const wait = Math.max(0, 600 - (Date.now() - rollStart.current));
    setTimeout(() => {
      rollingRef.current = false;
      setRolling(false);
      setDice(d.dice_value);
      setLastRolls((r) => ({ ...r, [d.seat_no]: d.dice_value }));
      // No valid move = the turn is already passing on the server (current_seat null until "game:turn" arrives)
      const passing = d.valid_token_ids.length === 0;
      setState((s) => s && { ...s, match: { ...s.match, dice_value: passing ? null : d.dice_value, current_seat: passing ? null : s.match.current_seat } });
      if (mine) {
        setMovable(d.valid_token_ids);
        if (!d.valid_token_ids.length) showToast('info', `You rolled ${d.dice_value}`, 'No token can move — turn passes');
      }
    }, wait);
  });

  useSocketEvent('game:moved', (d: { match_id: number; seat_no: number; token_id: number; to_position: number; captured_token_id: number | null; extra_turn: boolean; is_auto: boolean }) => {
    if (!forThisMatch(d)) return;
    setState((s) =>
      s && {
        ...s,
        tokens: s.tokens.map((t) =>
          t.token_id === d.token_id ? { ...t, position: d.to_position } : t.token_id === d.captured_token_id ? { ...t, position: -1 } : t
        ),
      }
    );
    const mine = !!mySeat && d.seat_no === mySeat.seat_no;
    if (mine) {
      setMovable([]);
      if (d.is_auto) showToast('info', "Time's up!", 'The server moved a token for you');
    }
    if (d.captured_token_id) Vibration.vibrate(mine ? [0, 60, 50, 60] : 150);
  });

  useSocketEvent('match:finished', (d: { match_id: number; rankings: Ranking[] }) => {
    if (!forThisMatch(d)) return;
    setRankings(d.rankings);
    setMovable([]);
    setState((s) =>
      s && {
        ...s,
        match: { ...s.match, status: 'finished', current_seat: null },
        seats: s.seats.map((seat) => ({ ...seat, finish_position: d.rankings.find((r) => r.seat_no === seat.seat_no)?.finish_position ?? null })),
      }
    );
  });

  useSocketEvent('tournament:lobby', (d: { match_id: number; present_player_ids: number[] }) => {
    if (forThisMatch(d)) setPresent(d.present_player_ids);
  });

  useSocketEvent('match:cancelled', (d: { match_id: number }) => {
    if (!forThisMatch(d)) return;
    setState((s) => s && { ...s, match: { ...s.match, status: 'cancelled' } });
    Alert.alert('Match cancelled', 'The organiser cancelled this tournament.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  });

  // ---------- my actions ----------
  async function roll() {
    if (!canRoll) return;
    rollStart.current = Date.now();
    rollingRef.current = true;
    setRolling(true);
    try {
      await emitAck('game:roll', { match_id: matchId }); // the result arrives as "game:rolled"
    } catch (err) {
      rollingRef.current = false;
      setRolling(false);
      showToast('error', errorMessage(err));
    }
  }

  async function move(tokenId: number) {
    if (!movable.includes(tokenId)) return;
    setMovable([]);
    try {
      await emitAck('game:move', { match_id: matchId, token_id: tokenId });
    } catch (err) {
      showToast('error', errorMessage(err));
      join(); // get the real state back from the server
    }
  }

  // ---------- render ----------
  if (error && !state) {
    return (
      <ScreenBackground>
        <EmptyState emoji="😕" title="Can't open this match" text={error} actionLabel="Go back" onAction={() => navigation.goBack()} />
      </ScreenBackground>
    );
  }
  if (!state || !match) {
    return (
      <ScreenBackground>
        <LoadingView message={socketConnected ? 'Joining the match…' : 'Connecting to the game server…'} />
      </ScreenBackground>
    );
  }

  // Put each seat in the screen corner of its colour (my colour is always bottom-left).
  const myColor = mySeat?.color ?? 'red';
  const i = CLOCKWISE.indexOf(myColor);
  const corner = (k: number) => state.seats.find((s) => s.color === CLOCKWISE[(i + k) % 4]);
  const [bottomLeft, topLeft, topRight, bottomRight] = [corner(0), corner(1), corner(2), corner(3)];
  const current = state.seats.find((s) => s.seat_no === match.current_seat);
  const boardSize = Math.min(width - 28, 460);

  const panel = (seat: Seat | undefined, align: 'left' | 'right') =>
    seat ? (
      <PlayerPanel
        seat={seat}
        isMe={seat.player_id === player?.player_id}
        isTurn={match.status === 'in_progress' && seat.seat_no === match.current_seat}
        deadline={seat.seat_no === match.current_seat ? deadline : null}
        turnSeconds={match.rule_set.turn_seconds}
        lastDice={lastRolls[seat.seat_no]}
        present={match.status === 'waiting' && match.match_type === 'tournament' ? !!seat.player_id && present.includes(seat.player_id) : undefined}
        align={align}
      />
    ) : (
      <View style={styles.emptyPanel} />
    );

  let status = '';
  if (match.status === 'waiting') status = match.match_type === 'room' ? 'Waiting for the host to start…' : 'Waiting for the match to start…';
  else if (finished) status = match.status === 'cancelled' ? 'Match cancelled' : 'Match finished';
  else if (isMyTurn) status = rolling ? 'Rolling…' : movable.length ? 'Tap a glowing token to move it' : 'Your turn — tap the dice!';
  else if (current) status = current.bot_id ? `${current.display_name} is thinking…` : `${current.display_name}'s turn`;
  else status = 'No move — next turn…';

  const title =
    match.match_type === 'tournament' ? `Round ${match.round_no} · Match ${match.match_no}` : match.match_type === 'room' ? `Room ${match.room_code}` : matchTypeLabel[match.match_type];

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft color={colors.text} size={24} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {match.rule_set.name} rules · {match.rule_set.tokens_to_win} token{match.rule_set.tokens_to_win > 1 ? 's' : ''} home to win
            {match.game_mode === '2v2' ? ' · 2 vs 2' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        {panel(topLeft, 'left')}
        <View style={styles.rowGap} />
        {panel(topRight, 'right')}
      </View>

      <View style={styles.boardWrap}>
        <LudoBoard
          size={boardSize}
          tokens={state.tokens}
          myColor={mySeat?.color}
          activeColor={match.status === 'in_progress' ? current?.color : null}
          movableTokenIds={movable}
          onTokenPress={move}
        />
        {match.status === 'waiting' && match.match_type === 'tournament' && (
          <View style={styles.lobby}>
            <TournamentLobby match={match} seats={state.seats} presentIds={present} myPlayerId={player?.player_id} />
          </View>
        )}
      </View>

      <Text style={[styles.status, isMyTurn && styles.statusMine]}>{status}</Text>

      <View style={styles.row}>
        {panel(bottomLeft, 'left')}
        <View style={styles.diceBox}>
          <Dice
            value={dice}
            rolling={rolling}
            onPress={canRoll ? roll : undefined}
            disabled={!canRoll}
            glowColor={current ? ludo[current.color].main : colors.gold}
            size={58}
          />
        </View>
        {panel(bottomRight, 'right')}
      </View>

      <ResultModal
        visible={!!rankings && match.status === 'finished'}
        rankings={rankings || []}
        seats={state.seats}
        myPlayerId={player?.player_id}
        isTournament={match.match_type === 'tournament'}
        onHome={() => navigation.popToTop()}
        onTournament={match.tournament_id ? () => navigation.replace('TournamentDetail', { tournamentId: match.tournament_id! }) : undefined}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { color: colors.textDim, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  rowGap: { width: 10 },
  emptyPanel: { flex: 1 },
  boardWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  lobby: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, backgroundColor: 'rgba(11,16,38,0.55)' },
  status: { color: colors.textDim, textAlign: 'center', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  statusMine: { color: colors.gold, fontSize: 17 },
  diceBox: { width: 100, alignItems: 'center', justifyContent: 'center' },
});
