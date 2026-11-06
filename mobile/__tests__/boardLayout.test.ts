// Checks the board geometry: every square in the right place, paths connected, same formula as the backend.
import { HOME_COLUMN, TRACK, START_OFFSET, movePath, tokenPoint, trackIndex, squareKey } from '../src/game/boardLayout';
import { movableTokenIds } from '../src/game/rules';
import type { LudoColor } from '../src/theme';
import type { RuleSet, Token } from '../src/types';

const COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
const key = ([r, c]: number[]) => `${r},${c}`;
const adjacent = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const inBase = ([r, c]: number[]) => (r < 6 || r > 8) && (c < 6 || c > 8);
const inCentre = ([r, c]: number[]) => r >= 6 && r <= 8 && c >= 6 && c <= 8;

test('track has 52 different squares, all on the arms of the cross', () => {
  expect(TRACK).toHaveLength(52);
  expect(new Set(TRACK.map(key)).size).toBe(52);
  TRACK.forEach((cell) => {
    expect(inBase(cell)).toBe(false);
    expect(inCentre(cell)).toBe(false);
  });
});

test('track + 4 home columns cover all 72 arm squares exactly once', () => {
  const all = [...TRACK, ...COLORS.flatMap((c) => HOME_COLUMN[c])].map(key);
  expect(all).toHaveLength(72);
  expect(new Set(all).size).toBe(72);
});

// On a real Ludo board the path turns the 4 inner corners diagonally (e.g. (6,5) → (5,6)).
const touching = (a: number[], b: number[]) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;

test('every track square touches the next one (including 51 → 0); only the 4 inner corners are diagonal', () => {
  TRACK.forEach((cell, i) => expect(touching(cell, TRACK[(i + 1) % 52])).toBe(true));
  const diagonal = TRACK.filter((cell, i) => !adjacent(cell, TRACK[(i + 1) % 52]));
  expect(diagonal.map(key)).toEqual(['6,5', '5,8', '8,9', '9,6']);
});

test('each colour turns from its square 50 into its home column, which leads to the centre', () => {
  COLORS.forEach((color) => {
    const last = TRACK[trackIndex(color, 50)!];
    const column = HOME_COLUMN[color];
    expect(adjacent(last, column[0])).toBe(true);
    column.forEach((cell, i) => i > 0 && expect(adjacent(column[i - 1], cell)).toBe(true));
    const end = column[4];
    expect([[end[0] + 1, end[1]], [end[0] - 1, end[1]], [end[0], end[1] + 1], [end[0], end[1] - 1]].some(inCentre)).toBe(true);
  });
});

test('shared square = (START_OFFSET + position) % 52, same as the backend', () => {
  expect(trackIndex('green', 0)).toBe(13);
  expect(trackIndex('blue', 20)).toBe(7);
  expect(trackIndex('red', 50)).toBe(50);
  expect(trackIndex('red', -1)).toBeNull();
  expect(trackIndex('red', 51)).toBeNull();
  COLORS.forEach((c) => expect(trackIndex(c, 0)).toBe(START_OFFSET[c]));
});

test('start squares sit next to their own base', () => {
  expect(tokenPoint('red', 0, 1)).toEqual({ x: 1.5, y: 6.5 });
  expect(tokenPoint('green', 0, 1)).toEqual({ x: 8.5, y: 1.5 });
  expect(tokenPoint('yellow', 0, 1)).toEqual({ x: 13.5, y: 8.5 });
  expect(tokenPoint('blue', 0, 1)).toEqual({ x: 6.5, y: 13.5 });
});

test('base slots are inside the base, finished tokens inside the centre', () => {
  COLORS.forEach((color) =>
    [1, 2, 3, 4].forEach((n) => {
      const b = tokenPoint(color, -1, n);
      expect(inBase([Math.floor(b.y), Math.floor(b.x)])).toBe(true);
      const h = tokenPoint(color, 56, n);
      expect(h.x).toBeGreaterThan(6);
      expect(h.x).toBeLessThan(9);
      expect(h.y).toBeGreaterThan(6);
      expect(h.y).toBeLessThan(9);
    })
  );
});

test('move path has one point per step; unlock and capture are one jump', () => {
  expect(movePath('red', 2, 6, 1)).toHaveLength(4);
  expect(movePath('red', 48, 53, 1)).toHaveLength(5);
  expect(movePath('red', -1, 0, 1)).toHaveLength(1);
  expect(movePath('red', 30, -1, 1)).toEqual([tokenPoint('red', -1, 1)]);
});

test('tokens of different colours on the same shared square get the same square key', () => {
  // green position 44 and red position 5 are both shared square 5
  expect(squareKey('green', 44, 1)).toBe(squareKey('red', 5, 3));
  expect(squareKey('red', -1, 1)).not.toBe(squareKey('red', -1, 2));
});

test('movable tokens follow the same rules as the server', () => {
  const rules = { six_to_unlock: 1 } as RuleSet;
  const tokens = [
    { token_id: 1, position: -1 },
    { token_id: 2, position: 53 },
    { token_id: 3, position: 10 },
  ] as Token[];
  expect(movableTokenIds(tokens, 6, rules)).toEqual([1, 3]);
  expect(movableTokenIds(tokens, 3, rules)).toEqual([2, 3]);
  expect(movableTokenIds(tokens, 1, { six_to_unlock: 0 } as RuleSet)).toEqual([1, 2, 3]);
});
