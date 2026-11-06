// Small checks for the text helpers and a smoke test that the main widgets build.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ludo_arena/theme.dart';
import 'package:ludo_arena/utils/format.dart';
import 'package:ludo_arena/widgets/dice_view.dart';
import 'package:ludo_arena/widgets/ludo_board.dart';
import 'package:ludo_arena/models.dart';

void main() {
  test('countdown text', () {
    expect(formatCountdown(const Duration(seconds: 0)), 'now');
    expect(formatCountdown(const Duration(seconds: 12)), '12s');
    expect(formatCountdown(const Duration(minutes: 4, seconds: 9)), '4m 09s');
    expect(formatCountdown(const Duration(hours: 2, minutes: 5)), '2h 05m');
    expect(formatCountdown(const Duration(hours: 50)), '2d 2h');
  });

  test('ordinals', () {
    expect([1, 2, 3, 4].map(ordinal).toList(), ['1st', '2nd', '3rd', '4th']);
  });

  testWidgets('board with 16 tokens and the dice build without errors', (tester) async {
    final tokens = [
      for (final c in LudoColor.values)
        for (var n = 1; n <= 4; n++)
          Token.fromJson({'token_id': c.index * 4 + n, 'token_no': n, 'seat_no': c.index + 1, 'color': c.name, 'position': n == 1 ? 5 : -1}),
    ];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Column(children: [
          LudoBoard(size: 300, tokens: tokens, myColor: LudoColor.blue, movableTokenIds: const [1, 2], onTokenTap: (_) {}),
          const DiceView(value: 6, rolling: false),
        ]),
      ),
    ));
    expect(find.byType(LudoBoard), findsOneWidget);
    expect(find.byType(DiceView), findsOneWidget);
    await tester.pumpWidget(const SizedBox()); // dispose the pulsing animations
  });
}
