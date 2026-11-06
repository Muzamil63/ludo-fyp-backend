// Online matchmaking: joins the queue, shows a searching animation, opens the board when matched.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import TokenPiece from '../../components/TokenPiece';
import GameButton from '../../components/GameButton';
import { emitAck } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { errorMessage } from '../../api/client';
import { colors, LudoColor } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Matchmaking'>;

const TITLES = { ffa2: '1 vs 1', ffa4: '4 Players', '2v2': '2 vs 2 Teams' };
const RING: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

export default function MatchmakingScreen({ navigation, route }: Props) {
  const { queueKey } = route.params;
  const { socketConnected } = useAuth();
  const { showToast } = useNotify();
  const [waiting, setWaiting] = useState(1);
  const [needed, setNeeded] = useState(queueKey === 'ffa2' ? 2 : 4);
  const [seconds, setSeconds] = useState(0);
  const matched = useRef(false);
  const spin = useRef(new Animated.Value(0)).current;

  const openGame = (matchId: number) => {
    if (matched.current) return;
    matched.current = true;
    navigation.replace('Game', { matchId });
  };

  // Join the queue once the socket is connected; leave it when this screen closes.
  useEffect(() => {
    if (!socketConnected) return;
    emitAck<{ matched: boolean; match_id: number | null }>('queue:join', { queue_key: queueKey })
      .then((res) => res.matched && res.match_id && openGame(res.match_id))
      .catch((err) => {
        showToast('error', 'Matchmaking failed', errorMessage(err));
        navigation.goBack();
      });
    return () => {
      if (!matched.current) emitAck('queue:leave').catch(() => {});
    };
  }, [socketConnected, queueKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useSocketEvent('queue:waiting', (d: { queue_key: string; waiting: number; needed: number }) => {
    if (d.queue_key !== queueKey) return;
    setWaiting(d.waiting);
    setNeeded(d.needed);
  });
  useSocketEvent('queue:matched', (d: { match_id: number }) => openGame(d.match_id));

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => {
      clearInterval(t);
      loop.stop();
    };
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <ScreenBackground>
      <View style={styles.center}>
        <Text style={styles.mode}>{TITLES[queueKey]}</Text>
        <Text style={styles.title}>Finding players…</Text>

        <View style={styles.ringBox}>
          <Animated.View style={[styles.ring, { transform: [{ rotate }] }]}>
            {RING.map((c, i) => (
              <Animated.View key={c} style={[styles.ringToken, styles[`pos${i}` as 'pos0'], { transform: [{ rotate: counter }] }]}>
                <TokenPiece color={c} size={54} />
              </Animated.View>
            ))}
          </Animated.View>
          <View style={styles.countBubble}>
            <Text style={styles.count}>{waiting}/{needed}</Text>
            <Text style={styles.countLabel}>players</Text>
          </View>
        </View>

        <Text style={styles.timer}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text>
        <Text style={styles.hint}>{socketConnected ? 'Waiting for other players to join this queue.' : 'Connecting to the game server…'}</Text>
      </View>
      <View style={styles.bottom}>
        <GameButton title="Cancel" icon={X} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </ScreenBackground>
  );
}

const SIZE = 240;
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mode: { color: colors.gold, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 6 },
  ringBox: { width: SIZE, height: SIZE, marginVertical: 36, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed' },
  ringToken: { position: 'absolute' },
  pos0: { top: -27, left: SIZE / 2 - 27 },
  pos1: { right: -27, top: SIZE / 2 - 27 },
  pos2: { bottom: -27, left: SIZE / 2 - 27 },
  pos3: { left: -27, top: SIZE / 2 - 27 },
  countBubble: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(124,92,255,0.25)', borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  count: { color: colors.text, fontSize: 34, fontWeight: '900' },
  countLabel: { color: colors.textDim, fontSize: 13 },
  timer: { color: colors.textDim, fontSize: 18, fontWeight: '800' },
  hint: { color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  bottom: { padding: 24 },
});
