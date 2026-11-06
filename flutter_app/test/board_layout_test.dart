// Checks the board geometry: every square in the right place, paths connected, same formula as the backend.
import 'package:flutter_test/flutter_test.dart';
import 'package:ludo_arena/game/board_layout.dart';
import 'package:ludo_arena/game/rules.dart';
import 'package:ludo_arena/models.dart';
import 'package:ludo_arena/theme.dart';

String key(List<int> c) => '${c[0]},${c[1]}';
bool adjacent(List<int> a, List<int> b) => (a[0] - b[0]).abs() + (a[1] - b[1]).abs() == 1;
bool touching(List<int> a, List<int> b) => (a[0] - b[0]).abs() <= 1 && (a[1] - b[1]).abs() <= 1 && key(a) != key(b);
bool inBase(List<int> c) => (c[0] < 6 || c[0] > 8) && (c[1] < 6 || c[1] > 8);
bool inCentre(List<int> c) => c[0] >= 6 && c[0] <= 8 && c[1] >= 6 && c[1] <= 8;

Token token(int id, int position) => Token.fromJson({'token_id': id, 'token_no': 1, 'seat_no': 1, 'color': 'red', 'position': position});
RuleSet rules(int sixToUnlock) =>
    RuleSet.fromJson({'rule_set_id': 1, 'name': 'T', 'six_to_unlock': sixToUnlock, 'tokens_to_win': 4, 'turn_seconds': 30});

void main() {
  test('track has 52 different squares, all on the arms of the cross', () {
    expect(track.length, 52);
    expect(track.map(key).toSet().length, 52);
    for (final c in track) {
      expect(inBase(c), false);
      expect(inCentre(c), false);
    }
  });

  test('track + 4 home columns cover all 72 arm squares exactly once', () {
    final all = [...track, for (final c in LudoColor.values) ...homeColumn[c]!].map(key).toList();
    expect(all.length, 72);
    expect(all.toSet().length, 72);
  });

  test('every track square touches the next one; only the 4 inner corners are diagonal', () {
    final diagonal = <String>[];
    for (var i = 0; i < 52; i++) {
      final next = track[(i + 1) % 52];
      expect(touching(track[i], next), true);
      if (!adjacent(track[i], next)) diagonal.add(key(track[i]));
    }
    expect(diagonal, ['6,5', '5,8', '8,9', '9,6']);
  });

  test('each colour turns from square 50 into its home column, which leads to the centre', () {
    for (final color in LudoColor.values) {
      final last = track[trackIndex(color, 50)!];
      final column = homeColumn[color]!;
      expect(adjacent(last, column.first), true);
      for (var i = 1; i < column.length; i++) {
        expect(adjacent(column[i - 1], column[i]), true);
      }
      final end = column.last;
      final neighbours = [[end[0] + 1, end[1]], [end[0] - 1, end[1]], [end[0], end[1] + 1], [end[0], end[1] - 1]];
      expect(neighbours.any(inCentre), true);
    }
  });

  test('shared square = (startOffset + position) % 52, same as the backend', () {
    expect(trackIndex(LudoColor.green, 0), 13);
    expect(trackIndex(LudoColor.blue, 20), 7);
    expect(trackIndex(LudoColor.red, 50), 50);
    expect(trackIndex(LudoColor.red, -1), null);
    expect(trackIndex(LudoColor.red, 51), null);
  });

  test('start squares sit next to their own base', () {
    expect(tokenPoint(LudoColor.red, 0, 1), const Offset(1.5, 6.5));
    expect(tokenPoint(LudoColor.green, 0, 1), const Offset(8.5, 1.5));
    expect(tokenPoint(LudoColor.yellow, 0, 1), const Offset(13.5, 8.5));
    expect(tokenPoint(LudoColor.blue, 0, 1), const Offset(6.5, 13.5));
  });

  test('move path: one point per step; unlock and capture are one jump', () {
    expect(movePath(LudoColor.red, 2, 6, 1).length, 4);
    expect(movePath(LudoColor.red, 48, 53, 1).length, 5);
    expect(movePath(LudoColor.red, -1, 0, 1).length, 1);
    expect(movePath(LudoColor.red, 30, -1, 1), [tokenPoint(LudoColor.red, -1, 1)]);
  });

  test('tokens of different colours on the same shared square share a square key', () {
    expect(squareKey(LudoColor.green, 44, 1), squareKey(LudoColor.red, 5, 3));
    expect(squareKey(LudoColor.red, -1, 1) == squareKey(LudoColor.red, -1, 2), false);
  });

  test('movable tokens follow the same rules as the server', () {
    final tokens = [token(1, -1), token(2, 53), token(3, 10)];
    expect(movableTokenIds(tokens, 6, rules(1)), [1, 3]);
    expect(movableTokenIds(tokens, 3, rules(1)), [2, 3]);
    expect(movableTokenIds(tokens, 1, rules(0)), [1, 2, 3]);
  });
}
