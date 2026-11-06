// A glossy Ludo pawn drawn with SVG, in one of the four colours.
import React from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { ludo, LudoColor } from '../theme';

export default function TokenPiece({ color, size = 32 }: { color: LudoColor; size?: number }) {
  const c = ludo[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="head" cx="40%" cy="35%" r="65%">
          <Stop offset="0" stopColor={c.light} />
          <Stop offset="0.55" stopColor={c.main} />
          <Stop offset="1" stopColor={c.dark} />
        </RadialGradient>
        <LinearGradient id="body" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={c.dark} />
          <Stop offset="0.45" stopColor={c.main} />
          <Stop offset="1" stopColor={c.dark} />
        </LinearGradient>
      </Defs>
      {/* shadow on the board */}
      <Ellipse cx="50" cy="90" rx="30" ry="7" fill="#000" opacity={0.28} />
      {/* base + body */}
      <Ellipse cx="50" cy="82" rx="31" ry="11" fill={c.dark} />
      <Path d="M22 80 Q25 58 40 50 L60 50 Q75 58 78 80 Q50 92 22 80 Z" fill="url(#body)" stroke="#fff" strokeWidth={3} />
      {/* head */}
      <Circle cx="50" cy="34" r="22" fill="url(#head)" stroke="#fff" strokeWidth={3.5} />
      <Circle cx="50" cy="34" r="8.5" fill="#fff" opacity={0.92} />
      {/* shine */}
      <Ellipse cx="42" cy="24" rx="6" ry="4" fill="#fff" opacity={0.55} />
    </Svg>
  );
}
