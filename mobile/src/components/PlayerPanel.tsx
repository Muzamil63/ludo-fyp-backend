// One player's card around the board: avatar, name, colour, "your turn" glow + timer bar, finish place.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import { colors, ludo } from '../theme';
import { useNow } from '../hooks/useNow';
import { ordinal } from '../utils/format';
import type { Seat } from '../types';

interface Props {
  seat: Seat;
  isMe: boolean;
  isTurn: boolean;
  deadline: number | null;
  turnSeconds: number;
  lastDice?: number | null;
  present?: boolean; // tournament lobby: is this player here?
  align?: 'left' | 'right';
}

export default function PlayerPanel({ seat, isMe, isTurn, deadline, turnSeconds, lastDice, present, align = 'left' }: Props) {
  const now = useNow(250);
  const c = ludo[seat.color];
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTurn) return glow.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.35, duration: 600, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isTurn, glow]);

  const left = deadline ? Math.max(0, deadline - now) : 0;
  const fraction = deadline ? Math.min(1, left / (turnSeconds * 1000)) : 0;
  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.12)', c.light] });
  const emoji = seat.bot_id ? '🤖' : undefined;

  return (
    <Animated.View style={[styles.card, { borderColor }, isTurn && { backgroundColor: `${c.main}33` }, align === 'right' && styles.reverse]}>
      <Avatar avatar={emoji} name={seat.display_name} size={36} ring={c.main} dim={present === false} />
      <View style={[styles.info, align === 'right' && styles.infoRight]}>
        <Text style={styles.name} numberOfLines={1}>
          {seat.display_name}
          {isMe ? ' (You)' : ''}
        </Text>
        <View style={[styles.metaRow, align === 'right' && styles.reverse]}>
          <View style={[styles.colorDot, { backgroundColor: c.main }]} />
          <Text style={styles.meta}>
            {seat.finish_position
              ? `${ordinal(seat.finish_position)} place`
              : present === false
              ? 'Not here yet'
              : present
              ? 'Ready'
              : seat.team_no
              ? `Team ${seat.team_no}`
              : seat.bot_id
              ? 'Computer'
              : 'Player'}
          </Text>
          {!!lastDice && <Text style={styles.dice}>🎲 {lastDice}</Text>}
        </View>
        {isTurn && deadline && (
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${fraction * 100}%`, backgroundColor: fraction < 0.3 ? colors.danger : c.light }]} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minHeight: 62,
  },
  reverse: { flexDirection: 'row-reverse' },
  info: { flex: 1, marginLeft: 8 },
  infoRight: { marginLeft: 0, marginRight: 8, alignItems: 'flex-end' },
  name: { color: colors.text, fontWeight: '800', fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  meta: { color: colors.textDim, fontSize: 11 },
  dice: { color: colors.gold, fontSize: 11, fontWeight: '800', marginHorizontal: 4 },
  timerTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 5, overflow: 'hidden', width: '100%' },
  timerFill: { height: 4, borderRadius: 2 },
});
