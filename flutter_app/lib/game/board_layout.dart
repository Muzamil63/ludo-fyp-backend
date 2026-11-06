// Where every Ludo square is on the 15 x 15 board. Pure functions, no Flutter widgets (unit tested).
//
// Board (row, col), 0..14: red base top-left, green top-right, yellow bottom-right, blue bottom-left.
// Tokens move clockwise. The backend sends each token's position relative to its own colour:
//   -1 = base, 0..50 = shared track (0 = own start square), 51..55 = own home column, 56 = home (centre).
// Shared track square = (startOffset[color] + position) % 52 — the same formula as the backend.
import 'dart:ui' show Offset;
import '../theme.dart';

const int boardCells = 15;
const int homePos = 56;
const Map<LudoColor, int> startOffset = {LudoColor.red: 0, LudoColor.green: 13, LudoColor.yellow: 26, LudoColor.blue: 39};
const List<int> safeCells = [0, 8, 13, 21, 26, 34, 39, 47];

/// The 52 shared track squares [row, col] in clockwise order, starting at red's start square.
const List<List<int>> track = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], //                    0-4
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], //            5-10
  [0, 7], //                                                    11 (green turns into home here)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], //            12-17 (13 = green start)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], //       18-23
  [7, 14], //                                                   24 (yellow turns into home)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], //       25-30 (26 = yellow start)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], //       31-36
  [14, 7], //                                                   37 (blue turns into home)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], //       38-43 (39 = blue start)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], //            44-49
  [7, 0], //                                                    50 (red turns into home)
  [6, 0], //                                                    51
];

/// Positions 51..55 of each colour (its private home column, leading to the centre).
const Map<LudoColor, List<List<int>>> homeColumn = {
  LudoColor.red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  LudoColor.green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  LudoColor.yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  LudoColor.blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

/// Top-left cell [row, col] of each 6 x 6 base.
const Map<LudoColor, List<int>> baseOrigin = {
  LudoColor.red: [0, 0],
  LudoColor.green: [0, 9],
  LudoColor.yellow: [9, 9],
  LudoColor.blue: [9, 0],
};

/// Where finished tokens (56) sit: inside their colour's triangle in the centre (x = column, y = row).
const Map<LudoColor, Offset> _homeSpot = {
  LudoColor.red: Offset(6.55, 7.5),
  LudoColor.green: Offset(7.5, 6.55),
  LudoColor.yellow: Offset(8.45, 7.5),
  LudoColor.blue: Offset(7.5, 8.45),
};

/// Rotate the board so MY colour sits at the bottom-left (number of 90° clockwise turns).
const Map<LudoColor, int> rotationTurns = {LudoColor.red: 3, LudoColor.green: 2, LudoColor.yellow: 1, LudoColor.blue: 0};

Offset _centre(List<int> cell) => Offset(cell[1].toDouble() + 0.5, cell[0].toDouble() + 0.5);

int? trackIndex(LudoColor color, int position) {
  if (position < 0 || position > 50) return null;
  return (startOffset[color]! + position) % 52;
}

/// Centre point of a token, in cells (x = column, y = row). tokenNo (1-4) picks the slot in the base / home.
Offset tokenPoint(LudoColor color, int position, int tokenNo) {
  if (position < 0) {
    final r = baseOrigin[color]![0].toDouble();
    final c = baseOrigin[color]![1].toDouble();
    final slots = [Offset(c + 2, r + 2), Offset(c + 4, r + 2), Offset(c + 2, r + 4), Offset(c + 4, r + 4)];
    return slots[(tokenNo - 1) % 4];
  }
  if (position >= homePos) {
    final spot = _homeSpot[color]!;
    final spread = (tokenNo - 2.5) * 0.28; // spread finished tokens a little
    return color == LudoColor.red || color == LudoColor.yellow ? spot.translate(0, spread) : spot.translate(spread, 0);
  }
  if (position > 50) return _centre(homeColumn[color]![position - 51]);
  return _centre(track[trackIndex(color, position)!]);
}

/// Every point a token passes when moving from → to (used for the step-by-step animation).
List<Offset> movePath(LudoColor color, int from, int to, int tokenNo) {
  if (to < 0) return [tokenPoint(color, -1, tokenNo)]; // captured: straight back to base
  if (from < 0) return [tokenPoint(color, 0, tokenNo)]; // unlocked: onto the start square
  return [for (var p = from + 1; p <= to; p++) tokenPoint(color, p, tokenNo)];
}

/// A stable key for "same square", so tokens sharing a square can be spread out.
String squareKey(LudoColor color, int position, int tokenNo) {
  if (position < 0) return 'base-${color.name}-$tokenNo';
  if (position >= homePos) return 'home-${color.name}-$tokenNo';
  if (position > 50) return 'col-${color.name}-$position';
  return 'track-${trackIndex(color, position)}';
}
