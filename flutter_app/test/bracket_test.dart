// Checks the bracket + custom-rule helpers, and that the full bracket tree builds (64-player preview, a preview
// with some players joined, and a running tournament with upcoming rounds).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ludo_arena/models.dart';
import 'package:ludo_arena/utils/bracket.dart';
import 'package:ludo_arena/utils/format.dart';
import 'package:ludo_arena/utils/rule_text.dart';
import 'package:ludo_arena/widgets/bracket_tree.dart';

// A 1v1 bracket the way the server sends it before anything is drawn (like backend/src/game/bracket.js).
List<Map<String, dynamic>> previewRounds(int players) {
  final rounds = <Map<String, dynamic>>[];
  var roundNo = 1;
  for (var matches = players ~/ 2; matches >= 1; matches ~/= 2, roundNo++) {
    rounds.add({
      'round_no': roundNo,
      'matches': [
        for (var i = 0; i < matches; i++)
          {
            'match_id': null, 'round_no': roundNo, 'match_no': i + 1, 'status': 'upcoming', 'scheduled_at': null,
            'seats': <dynamic>[], 'winner_id': null, 'slots': 2,
            'feeders': roundNo == 1 ? <int>[] : [2 * i + 1, 2 * i + 2],
          },
      ],
    });
  }
  return rounds;
}

Map<String, dynamic> seat(int no, int playerId, String color, String name) =>
    {'match_player_id': no, 'seat_no': no, 'color': color, 'player_id': playerId, 'display_name': name};

void main() {
  test('round names count back from the final', () {
    expect(roundName(6, 6), 'Final');
    expect(roundName(5, 6), 'Semi-finals');
    expect(roundName(4, 6), 'Quarter-finals');
    expect(roundName(2, 6), 'Round 2');
  });

  test('drawnRounds keeps only matches that exist', () {
    final rounds = previewRounds(4).map(TournamentRound.fromJson).toList();
    expect(drawnRounds(rounds), isEmpty);
    final json = previewRounds(4);
    json[0]['matches'][0] = {...json[0]['matches'][0] as Map<String, dynamic>, 'match_id': 7, 'status': 'waiting', 'scheduled_at': '2026-11-16T10:00:00Z'};
    final drawn = drawnRounds(json.map(TournamentRound.fromJson).toList());
    expect(drawn.length, 1);
    expect(drawn[0].matches.single.matchId, 7);
  });

  test('rule summary and rule choice body', () {
    expect(ruleSummary(classicRules), '6 to start · 4 home · 30s turns');
    final custom = {...classicRules, 'six_to_unlock': 0, 'capture_enabled': 0, 'extra_turn_on_six': 0, 'tries_when_all_home': 5, 'six_boost_after': 0};
    expect(ruleSummary(custom), '1 or 6 to start · 4 home · 30s turns · no capture · no extra turn on 6 · 6 by try 5 · fair dice');
    expect(const RuleChoice.preset(2).toJson(), {'rule_set_id': 2});
    expect(RuleChoice.custom(custom).toJson(), {'custom_rules': custom});
    final rs = RuleSet.fromJson({'rule_set_id': 9, 'name': 'Custom', ...custom, 'is_custom': 1});
    expect(rs.isCustom, true);
    expect(rs.rules, custom);
  });

  testWidgets('64-player preview tree builds with every round', (tester) async {
    final rounds = previewRounds(64).map(TournamentRound.fromJson).toList();
    expect(rounds.length, 6);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: BracketTree(rounds: rounds, preview: true))));
    expect(find.text('Final'), findsNWidgets(2)); // round chip + column title
    expect(find.text('Open slot'), findsNWidgets(64));
    expect(find.text('Winner of R5 M2'), findsOneWidget);

    // A round chip (the first "Round 2" text; the second is the column title) moves that column to the left edge
    final round2Card = find.text('Winner of R1 M1');
    expect(tester.getTopLeft(round2Card).dx, greaterThan(200));
    await tester.tap(find.text('Round 2').first);
    await tester.pump();
    expect(tester.getTopLeft(round2Card).dx, lessThan(100));

    // The final can't move past the tree's right edge, but it comes fully on screen (the test screen is 800 wide)
    final finalCard = find.text('Winner of R5 M1');
    expect(tester.getTopLeft(finalCard).dx, greaterThan(800));
    await tester.tap(find.text('Final').first);
    await tester.pump();
    expect(tester.getTopLeft(finalCard).dx, lessThan(800 - 150));
  });

  testWidgets('running tournament: winner, me, and the upcoming final', (tester) async {
    final json = previewRounds(4);
    json[0]['matches'] = [
      {
        'match_id': 1, 'round_no': 1, 'match_no': 1, 'status': 'finished', 'scheduled_at': '2026-11-16T10:00:00Z',
        'seats': [seat(1, 10, 'red', 'Ali'), seat(3, 11, 'yellow', 'Sara')], 'winner_id': 10, 'slots': 2, 'feeders': <int>[],
      },
      {
        'match_id': 2, 'round_no': 1, 'match_no': 2, 'status': 'in_progress', 'scheduled_at': '2026-11-16T10:00:00Z',
        'seats': [seat(1, 12, 'red', 'Zain'), seat(3, 13, 'yellow', 'Max')], 'winner_id': null, 'slots': 2, 'feeders': <int>[],
      },
    ];
    final opened = <int>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: BracketTree(rounds: json.map(TournamentRound.fromJson).toList(), myPlayerId: 12, preview: false, onOpenMatch: opened.add)),
    ));
    expect(find.text('● LIVE'), findsOneWidget);
    expect(find.text('You'), findsOneWidget);
    expect(find.text('Winner of R1 M1'), findsOneWidget);
    await tester.tap(find.text('You'));
    expect(opened, [2]); // my live match opens the game
  });

  testWidgets('preview: players who joined so far, then open slots and planned times', (tester) async {
    final json = previewRounds(4);
    final m1 = json[0]['matches'][0] as Map<String, dynamic>;
    m1['seats'] = [seat(1, 10, 'red', 'Ali')]; // 1 of 2 places taken
    const planned = '2026-11-16T10:20:00Z';
    json[1]['matches'][0] = {...json[1]['matches'][0] as Map<String, dynamic>, 'scheduled_at': planned}; // the final's planned time
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: BracketTree(rounds: json.map(TournamentRound.fromJson).toList(), preview: true))));
    expect(find.text('Ali'), findsOneWidget);
    expect(find.text('Open slot'), findsNWidgets(3)); // 1 left in M1 + 2 in M2
    expect(find.text(formatTime(DateTime.parse(planned).toLocal())), findsOneWidget);
    expect(find.text('Upcoming'), findsNWidgets(2)); // the round-1 matches have no time here
  });
}
