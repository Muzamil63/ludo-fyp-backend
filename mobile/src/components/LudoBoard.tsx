// The Ludo board: drawn with SVG (bases, track, stars, home triangles) + the tokens on top.
// Tokens slide square by square when they move. Tokens the player can move pulse and are tappable.
// The whole board is rotated so the player's own colour is always at the bottom-left.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polygon, Rect } from 'react-native-svg';
import TokenPiece from './TokenPiece';
import { ludo, LudoColor } from '../theme';
import {
  BASE_ORIGIN, BOARD_CELLS, HOME_COLUMN, Point, ROTATION, SAFE_CELLS, START_OFFSET, TRACK,
  movePath, squareKey, tokenPoint,
} from '../game/boardLayout';
import type { Token } from '../types';

const COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
const START_SQUARES = Object.values(START_OFFSET);

// Points of a 5-pointed star (for the safe squares).
function starPoints(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

// ---------- the static board drawing ----------
const BoardDrawing = React.memo(function BoardDrawing({ size, activeColor }: { size: number; activeColor?: LudoColor | null }) {
  const S = size / BOARD_CELLS;
  const cell = (r: number, c: number, fill: string, key: string) => (
    <Rect key={key} x={c * S} y={r * S} width={S} height={S} fill={fill} stroke="#CFC8B8" strokeWidth={0.8} />
  );

  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} rx={S * 0.6} fill="#FFFDF7" />

      {/* the 4 bases */}
      {COLORS.map((color) => {
        const [r, c] = BASE_ORIGIN[color];
        const active = color === activeColor;
        return (
          <G key={color}>
            <Rect x={c * S} y={r * S} width={6 * S} height={6 * S} fill={ludo[color].main} />
            <Rect
              x={(c + 1) * S}
              y={(r + 1) * S}
              width={4 * S}
              height={4 * S}
              rx={S * 0.7}
              fill="#FFFFFF"
              stroke={active ? '#FFC93C' : ludo[color].dark}
              strokeWidth={active ? 4 : 1.5}
            />
            {[[2, 2], [2, 4], [4, 2], [4, 4]].map(([dr, dc]) => (
              <Circle key={`${dr}${dc}`} cx={(c + dc) * S} cy={(r + dr) * S} r={S * 0.62} fill={ludo[color].light} stroke={ludo[color].main} strokeWidth={2} />
            ))}
          </G>
        );
      })}

      {/* the shared track: start squares are coloured, safe squares get a star */}
      {TRACK.map(([r, c], i) => {
        const startOf = COLORS.find((col) => START_OFFSET[col] === i);
        return cell(r, c, startOf ? ludo[startOf].main : '#FFFFFF', `t${i}`);
      })}
      {SAFE_CELLS.filter((i) => !START_SQUARES.includes(i)).map((i) => {
        const [r, c] = TRACK[i];
        return <Polygon key={`s${i}`} points={starPoints((c + 0.5) * S, (r + 0.5) * S, S * 0.38, S * 0.16)} fill="#C9C1AE" />;
      })}
      {START_SQUARES.map((i) => {
        const [r, c] = TRACK[i];
        return <Polygon key={`st${i}`} points={starPoints((c + 0.5) * S, (r + 0.5) * S, S * 0.36, S * 0.15)} fill="rgba(255,255,255,0.85)" />;
      })}

      {/* home columns */}
      {COLORS.map((color) => HOME_COLUMN[color].map(([r, c], i) => cell(r, c, ludo[color].main, `h${color}${i}`)))}

      {/* centre: 4 triangles meeting in the middle */}
      <Polygon points={`${6 * S},${6 * S} ${6 * S},${9 * S} ${7.5 * S},${7.5 * S}`} fill={ludo.red.main} />
      <Polygon points={`${6 * S},${6 * S} ${9 * S},${6 * S} ${7.5 * S},${7.5 * S}`} fill={ludo.green.main} />
      <Polygon points={`${9 * S},${6 * S} ${9 * S},${9 * S} ${7.5 * S},${7.5 * S}`} fill={ludo.yellow.main} />
      <Polygon points={`${6 * S},${9 * S} ${9 * S},${9 * S} ${7.5 * S},${7.5 * S}`} fill={ludo.blue.main} />
      <Circle cx={7.5 * S} cy={7.5 * S} r={S * 0.45} fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
});

// ---------- one token ----------
interface TokenProps {
  token: Token;
  cellSize: number;
  tokenSize: number;
  target: { x: number; y: number }; // top-left pixel position
  counterRotate: string;
  selectable: boolean;
  onPress: () => void;
}

function AnimatedToken({ token, cellSize, tokenSize, target, counterRotate, selectable, onPress }: TokenProps) {
  const pos = useRef(new Animated.ValueXY(target)).current;
  const lastPosition = useRef(token.position);
  const pulse = useRef(new Animated.Value(1)).current;

  // Move along the board when the position changes; otherwise glide to the new spot (stacking changes).
  useEffect(() => {
    const from = lastPosition.current;
    lastPosition.current = token.position;
    if (from === token.position) {
      Animated.spring(pos, { toValue: target, useNativeDriver: true, friction: 7 }).start();
      return;
    }
    const toPixels = (p: Point) => ({ x: p.x * cellSize - tokenSize / 2, y: p.y * cellSize - tokenSize / 2 });
    const steps = movePath(token.color, from, token.position, token.token_no).map(toPixels);
    // The final spot includes the stacking offset. (No steps = position went back after a resync: jump.)
    if (steps.length === 0) steps.push(target);
    else steps[steps.length - 1] = target;
    const stepMs = token.position < 0 ? 420 : 140; // captured tokens fly home in one go
    Animated.sequence(
      steps.map((p) => Animated.timing(pos, { toValue: p, duration: stepMs, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    ).start();
  }, [token.position, token.color, token.token_no, target.x, target.y, cellSize, tokenSize, pos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulse when the player can move this token
  useEffect(() => {
    if (!selectable) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.22, duration: 380, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 380, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [selectable, pulse]);

  return (
    <Animated.View
      style={[styles.token, { width: tokenSize, height: tokenSize, zIndex: selectable ? 20 : 10 }, { transform: [...pos.getTranslateTransform(), { scale: pulse }] }]}
    >
      <Pressable onPress={onPress} disabled={!selectable} hitSlop={8} style={{ transform: [{ rotate: counterRotate }] }}>
        {selectable && <View style={[styles.ring, { width: tokenSize, height: tokenSize, borderRadius: tokenSize / 2 }]} />}
        <TokenPiece color={token.color} size={tokenSize} />
      </Pressable>
    </Animated.View>
  );
}

// ---------- the full board ----------
interface Props {
  size: number;
  tokens: Token[];
  myColor?: LudoColor | null;
  activeColor?: LudoColor | null;
  movableTokenIds: number[];
  onTokenPress: (tokenId: number) => void;
}

export default function LudoBoard({ size, tokens, myColor, activeColor, movableTokenIds, onTokenPress }: Props) {
  const S = size / BOARD_CELLS;
  const turns = myColor ? ROTATION[myColor] : 0;
  const rotate = `${turns * 90}deg`;
  const counterRotate = `${-turns * 90}deg`;

  // Tokens on the same square are shrunk and spread a little so all of them stay visible.
  const placed = useMemo(() => {
    const groups: Record<string, Token[]> = {};
    for (const t of tokens) {
      const k = squareKey(t.color, t.position, t.token_no);
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    }
    return tokens.map((t) => {
      const group = groups[squareKey(t.color, t.position, t.token_no)];
      const index = group.indexOf(t);
      const crowded = group.length > 1;
      const tokenSize = S * (crowded ? 0.78 : 1.0);
      const p = tokenPoint(t.color, t.position, t.token_no);
      const spread = crowded ? (index - (group.length - 1) / 2) * S * 0.28 : 0;
      return { token: t, tokenSize, target: { x: p.x * S - tokenSize / 2 + spread, y: p.y * S - tokenSize / 2 - (crowded ? spread * 0.3 : 0) } };
    });
  }, [tokens, S]);

  return (
    <View style={[styles.frame, { width: size + 12, height: size + 12, borderRadius: S * 0.8 + 6 }]}>
      <View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <BoardDrawing size={size} activeColor={activeColor} />
        {placed.map(({ token, tokenSize, target }) => (
          <AnimatedToken
            key={token.token_id}
            token={token}
            cellSize={S}
            tokenSize={tokenSize}
            target={target}
            counterRotate={counterRotate}
            selectable={movableTokenIds.includes(token.token_id)}
            onPress={() => onTokenPress(token.token_id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 6,
    backgroundColor: '#2A1E66',
    borderWidth: 2,
    borderColor: 'rgba(255,201,60,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  token: { position: 'absolute', left: 0, top: 0 },
  ring: { position: 'absolute', borderWidth: 3, borderColor: '#FFC93C', backgroundColor: 'rgba(255,201,60,0.25)' },
});
