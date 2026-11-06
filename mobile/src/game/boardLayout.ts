// Where every Ludo square is on the 15 x 15 board. Pure functions, no React (unit tested).
//
// Board (row, col), 0..14:   red base top-left, green top-right, yellow bottom-right, blue bottom-left.
// Tokens move clockwise. The backend sends each token's position relative to its own colour:
//   -1 = base, 0..50 = shared track (0 = own start square), 51..55 = own home column, 56 = home (centre).
// Shared track square = (START_OFFSET[color] + position) % 52  — the same formula as the backend.
import type { LudoColor } from '../theme';

export type Cell = [number, number]; // [row, col]
export type Point = { x: number; y: number }; // centre point, in "cells" (0..15)

export const BOARD_CELLS = 15;
export const HOME_POS = 56;
export const START_OFFSET: Record<LudoColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
export const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47]; // shared track squares where nobody is captured

// The 52 shared track squares in clockwise order, starting at red's start square.
export const TRACK: Cell[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], //                          0-4
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], //                  5-10
  [0, 7], //                                                          11 (green turns into home here)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], //                  12-17 (13 = green start)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], //             18-23
  [7, 14], //                                                         24 (yellow turns into home)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], //             25-30 (26 = yellow start)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], //             31-36
  [14, 7], //                                                         37 (blue turns into home)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], //             38-43 (39 = blue start)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], //                  44-49
  [7, 0], //                                                          50 (red turns into home)
  [6, 0], //                                                          51
];

// Positions 51..55 of each colour (its private home column, leading to the centre).
export const HOME_COLUMN: Record<LudoColor, Cell[]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

// Top-left cell of each 6 x 6 base.
export const BASE_ORIGIN: Record<LudoColor, Cell> = { red: [0, 0], green: [0, 9], yellow: [9, 9], blue: [9, 0] };

// Where finished tokens (56) sit: inside their colour's triangle in the centre.
const HOME_SPOT: Record<LudoColor, Point> = {
  red: { x: 6.55, y: 7.5 },
  green: { x: 7.5, y: 6.55 },
  yellow: { x: 8.45, y: 7.5 },
  blue: { x: 7.5, y: 8.45 },
};

const cellCentre = ([row, col]: Cell): Point => ({ x: col + 0.5, y: row + 0.5 });

export function trackIndex(color: LudoColor, position: number): number | null {
  if (position < 0 || position > 50) return null;
  return (START_OFFSET[color] + position) % 52;
}

// Centre point of a token (in cells). tokenNo (1-4) picks the slot in the base / home triangle.
export function tokenPoint(color: LudoColor, position: number, tokenNo: number): Point {
  if (position < 0) {
    const [r, c] = BASE_ORIGIN[color];
    const slots: Point[] = [
      { x: c + 2, y: r + 2 }, { x: c + 4, y: r + 2 },
      { x: c + 2, y: r + 4 }, { x: c + 4, y: r + 4 },
    ];
    return slots[(tokenNo - 1) % 4];
  }
  if (position >= HOME_POS) {
    const spot = HOME_SPOT[color];
    const spread = (tokenNo - 2.5) * 0.28; // spread finished tokens a little
    return color === 'red' || color === 'yellow' ? { x: spot.x, y: spot.y + spread } : { x: spot.x + spread, y: spot.y };
  }
  if (position > 50) return cellCentre(HOME_COLUMN[color][position - 51]);
  return cellCentre(TRACK[trackIndex(color, position)!]);
}

// Every point a token passes when moving from → to (used for the step-by-step animation).
export function movePath(color: LudoColor, from: number, to: number, tokenNo: number): Point[] {
  if (to < 0) return [tokenPoint(color, -1, tokenNo)]; // captured: jump straight back to base
  if (from < 0) return [tokenPoint(color, 0, tokenNo)]; // unlocked: onto the start square
  const points: Point[] = [];
  for (let p = from + 1; p <= to; p++) points.push(tokenPoint(color, p, tokenNo));
  return points;
}

// Rotate the board so MY colour sits at the bottom-left (number of 90° clockwise turns).
export const ROTATION: Record<LudoColor, number> = { red: 3, green: 2, yellow: 1, blue: 0 };

// A stable key for "same square", so tokens sharing a square can be spread out.
export function squareKey(color: LudoColor, position: number, tokenNo: number): string {
  if (position < 0) return `base-${color}-${tokenNo}`;
  if (position >= HOME_POS) return `home-${color}-${tokenNo}`;
  if (position > 50) return `col-${color}-${position}`;
  return `track-${trackIndex(color, position)}`;
}
