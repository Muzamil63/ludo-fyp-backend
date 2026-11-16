// The whole knockout tree, round 1 → final: match cards joined by lines (the winner moves to the right).
// It scrolls sideways and up/down, so 64 players (32 first-round matches) fit. Each later match is drawn
// halfway between the matches that feed it (the server sends those as `feeders`). The round chips on top
// jump straight to a round (handy with 6 rounds).
import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Crown } from 'lucide-react-native';
import { formatTime } from '../utils/format';
import { roundName, type Round } from '../utils/bracket';
import { colors, ludo, radius } from '../theme';
import type { BracketMatch } from '../types';

const CARD_W = 172;
const COL_GAP = 34; // space between two rounds, where the lines run
const ROW_GAP = 14; // space between two first-round cards
const HEAD_H = 36; // round name above each column
const TOP_H = 26; // "M3 · 18:05" row inside a card
const SEAT_H = 22;

interface Props {
  rounds: Round[];
  myPlayerId?: number;
  preview: boolean; // before the start: empty "open slot" places
  onOpenMatch?: (matchId: number) => void;
}

export default function BracketTree({
  rounds,
  myPlayerId,
  preview,
  onOpenMatch,
}: Props) {
  const vertical = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const horizontal = useRef<React.ComponentRef<typeof ScrollView>>(null);
  if (rounds.length === 0) return null;
  const maxSlots = Math.max(
    ...rounds.flatMap(r => r.matches.map(m => m.slots)),
  );
  const cardH = TOP_H + maxSlots * SEAT_H + 10;
  const x = (r: number) => r * (CARD_W + COL_GAP);

  // Vertical centre of every card. Round 1 cards are stacked; a later card sits between its first and last feeder.
  const centers: number[][] = [];
  rounds.forEach((round, r) => {
    centers[r] = round.matches.map((m, i) =>
      r === 0
        ? HEAD_H + i * (cardH + ROW_GAP) + cardH / 2
        : (centers[r - 1][m.feeders[0] - 1] +
            centers[r - 1][m.feeders[m.feeders.length - 1] - 1]) /
          2,
    );
  });
  const width = x(rounds.length) - COL_GAP;
  const height = HEAD_H + rounds[0].matches.length * (cardH + ROW_GAP);

  // One elbow line from each feeder card to the card it feeds (gold once that feeder match has a winner).
  const lines = rounds.slice(1).flatMap((round, k) =>
    round.matches.flatMap((m, i) =>
      m.feeders.map(f => {
        const r = k + 1;
        const x1 = x(r - 1) + CARD_W;
        const y1 = centers[r - 1][f - 1];
        const xm = x1 + COL_GAP / 2;
        return {
          key: `${r}-${i}-${f}`,
          d: `M${x1} ${y1} H${xm} V${centers[r][i]} H${x(r)}`,
          done: rounds[r - 1].matches[f - 1].winner_id !== null,
        };
      }),
    ),
  );

  // Scrolls so the round's column and its first match are on screen.
  function jumpTo(r: number) {
    horizontal.current?.scrollTo({ x: Math.max(0, x(r) - 16), animated: true });
    vertical.current?.scrollTo({
      y: Math.max(0, centers[r][0] - cardH),
      animated: true,
    });
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipBar}
      >
        {rounds.map((round, r) => (
          <Pressable
            key={round.round_no}
            onPress={() => jumpTo(r)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>
              {roundName(round.round_no, rounds.length)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView ref={vertical} contentContainerStyle={styles.outer}>
        <ScrollView
          ref={horizontal}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.inner}
        >
          <View style={{ width, height }}>
            <Svg width={width} height={height} style={styles.lines}>
              {lines.map(l => (
                <Path
                  key={l.key}
                  d={l.d}
                  stroke={l.done ? colors.gold : colors.cardBorder}
                  strokeWidth={2}
                  fill="none"
                />
              ))}
            </Svg>
            {rounds.map((round, r) => (
              <React.Fragment key={round.round_no}>
                <Text style={[styles.roundName, { left: x(r) }]}>
                  {roundName(round.round_no, rounds.length)}
                </Text>
                {round.matches.map((m, i) => (
                  <MatchCard
                    key={m.match_no}
                    match={m}
                    myPlayerId={myPlayerId}
                    preview={preview}
                    onOpen={onOpenMatch}
                    style={{
                      left: x(r),
                      top: centers[r][i] - cardH / 2,
                      height: cardH,
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// One match: number + state, then its players (or who will play there).
function MatchCard({
  match: m,
  myPlayerId,
  preview,
  onOpen,
  style,
}: {
  match: BracketMatch;
  myPlayerId?: number;
  preview: boolean;
  onOpen?: (matchId: number) => void;
  style: ViewStyle;
}) {
  const mine = m.seats.some(s => s.player_id === myPlayerId);
  const canOpen =
    mine &&
    (m.status === 'waiting' || m.status === 'in_progress') &&
    m.match_id !== null &&
    !!onOpen;
  const state =
    m.status === 'in_progress'
      ? { text: '● LIVE', color: colors.danger }
      : m.status === 'finished'
      ? { text: 'Done', color: colors.textMuted }
      : m.status === 'waiting' && m.scheduled_at
      ? { text: formatTime(m.scheduled_at), color: colors.info }
      : m.status === 'cancelled'
      ? { text: 'Cancelled', color: colors.textMuted }
      : { text: preview ? '' : 'Upcoming', color: colors.textMuted };
  // Not drawn yet: round 1 has open places; later rounds wait for the winners of their feeder matches.
  const placeholders = m.feeders.length
    ? m.feeders.map(f => `Winner of R${m.round_no - 1} M${f}`)
    : Array.from({ length: m.slots }, () => (preview ? 'Open slot' : 'TBD'));

  return (
    <Pressable
      disabled={!canOpen}
      onPress={() => canOpen && onOpen!(m.match_id!)}
      style={[
        styles.card,
        style,
        mine && styles.cardMine,
        m.status === 'in_progress' && styles.cardLive,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.matchNo}>M{m.match_no}</Text>
        <Text style={[styles.state, { color: state.color }]}>{state.text}</Text>
      </View>
      {m.seats.length > 0
        ? m.seats.map(s => {
            const winner = m.winner_id !== null && s.player_id === m.winner_id;
            const lost = m.status === 'finished' && !winner;
            return (
              <View
                key={s.seat_no}
                style={[styles.seat, winner && styles.seatWinner]}
              >
                <View
                  style={[styles.dot, { backgroundColor: ludo[s.color].main }]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.name,
                    lost && styles.lost,
                    s.player_id === myPlayerId && styles.me,
                  ]}
                >
                  {s.player_id === myPlayerId ? 'You' : s.display_name}
                </Text>
                {winner && <Crown color={colors.gold} size={13} />}
              </View>
            );
          })
        : placeholders.map((text, k) => (
            <View key={k} style={styles.seat}>
              <View style={[styles.dot, styles.dotEmpty]} />
              <Text numberOfLines={1} style={styles.placeholder}>
                {text}
              </Text>
            </View>
          ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  chipBar: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.card,
  },
  chipText: { color: colors.gold, fontWeight: '800', fontSize: 12 },
  outer: { paddingVertical: 12 },
  inner: { paddingHorizontal: 16 },
  lines: { position: 'absolute', left: 0, top: 0 },
  roundName: {
    position: 'absolute',
    top: 0,
    width: CARD_W,
    height: HEAD_H,
    textAlign: 'center',
    color: colors.gold,
    fontWeight: '900',
    fontSize: 14,
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    paddingHorizontal: 9,
    paddingTop: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.cardSolid,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  cardMine: { borderColor: colors.gold, borderWidth: 2 },
  cardLive: { borderColor: colors.danger },
  cardTop: {
    height: TOP_H - 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchNo: { color: colors.textDim, fontWeight: '900', fontSize: 12 },
  state: { fontWeight: '800', fontSize: 11 },
  seat: {
    height: SEAT_H,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  seatWinner: { backgroundColor: 'rgba(255,201,60,0.18)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotEmpty: { borderWidth: 1, borderColor: colors.textMuted },
  name: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 12.5 },
  lost: { color: colors.textMuted, textDecorationLine: 'line-through' },
  me: { color: colors.gold },
  placeholder: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
