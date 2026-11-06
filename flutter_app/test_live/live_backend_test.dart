// Live check: runs the app's real API + socket code against a running backend on localhost:3000.
// Plays a full bot match through SocketService and parses every endpoint. Run: flutter test test_live/
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:ludo_arena/api/api_client.dart';
import 'package:ludo_arena/api/endpoints.dart';
import 'package:ludo_arena/api/socket_service.dart';
import 'package:ludo_arena/models.dart';

void main() {
  test('live: login, all GET endpoints parse, full bot match over the socket', () async {
    ApiClient.setServerUrl('http://localhost:3000');
    final login = await AuthApi.login('demo2', 'password123');
    ApiClient.token = login['token'] as String;
    final me = await AuthApi.me();
    expect(me.username, 'demo2');

    // every list/detail endpoint parses into the models
    final ruleSets = await MatchApi.ruleSets();
    expect(ruleSets.length, greaterThanOrEqualTo(3));
    final tournaments = await TournamentApi.list();
    expect(tournaments, isNotEmpty);
    final detail = await TournamentApi.detail(tournaments.first.tournamentId);
    expect(detail.tournament.tournamentId, tournaments.first.tournamentId);
    for (final t in tournaments.where((t) => t.status == 'finished').take(2)) {
      final d = await TournamentApi.detail(t.tournamentId);
      expect(d.rounds, isNotEmpty);
    }
    await TournamentApi.mine();
    await TournamentApi.myMatches();
    await TournamentApi.invitations();
    await RoomApi.invitations();
    await FriendApi.list();
    await FriendApi.requests();
    await UserApi.leaderboard();
    await UserApi.myMatches();
    await UserApi.search('demo');

    // socket
    final socket = SocketService.instance;
    socket.connect(ApiClient.serverUrl, ApiClient.token!);
    for (var i = 0; i < 50 && !socket.connected.value; i++) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
    expect(socket.connected.value, true);

    final matchId = await MatchApi.createBot(ruleSetId: 3, totalPlayers: 2, gameMode: 'ffa', difficulty: 'hard');
    final state = MatchState.fromJson(Map<String, dynamic>.from(await socket.emitAck('match:join', {'match_id': matchId}) as Map));
    final mySeat = state.seats.firstWhere((s) => s.playerId == me.playerId);

    final finished = Completer<List<Ranking>>();
    var rolls = 0, moves = 0;
    socket.on('game:moved', (d) {
      if (d['match_id'] == matchId) moves++;
    });
    socket.on('match:finished', (d) {
      if (d['match_id'] != matchId || finished.isCompleted) return;
      finished.complete((d['rankings'] as List).map((r) => Ranking.fromJson(Map<String, dynamic>.from(r as Map))).toList());
    });
    socket.on('game:turn', (d) async {
      if (d['match_id'] != matchId || d['seat_no'] != mySeat.seatNo) return;
      try {
        final r = await socket.emitAck('game:roll', {'match_id': matchId});
        rolls++;
        final valid = List<int>.from(r['valid_token_ids'] as List);
        if (valid.isNotEmpty) await socket.emitAck('game:move', {'match_id': matchId, 'token_id': valid.first});
      } catch (_) {
        // a turn that the timer already played is fine
      }
    });

    final rankings = await finished.future.timeout(const Duration(minutes: 4));
    expect(rankings.length, 2);
    expect(rankings.where((r) => r.finishPosition == 1).length, 1);
    expect(rolls, greaterThan(0));
    expect(moves, greaterThan(0));

    // wrong roll after the end is refused with the server's message
    await expectLater(socket.emitAck('game:roll', {'match_id': matchId}), throwsA(isA<ApiException>()));
    socket.disconnect();
  }, timeout: const Timeout(Duration(minutes: 6)));
}
