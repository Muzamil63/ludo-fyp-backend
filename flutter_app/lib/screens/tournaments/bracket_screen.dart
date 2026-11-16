// Full-screen bracket map of a tournament: every round from round 1 to the final. Updates live as matches
// finish; tap your own open match to play it.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/api_client.dart';
import '../../api/endpoints.dart';
import '../../api/socket_service.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/bracket_tree.dart';
import '../../widgets/common.dart';
import '../game/game_screen.dart';

class BracketScreen extends StatefulWidget {
  final int tournamentId;
  const BracketScreen({super.key, required this.tournamentId});
  @override
  State<BracketScreen> createState() => _BracketScreenState();
}

class _BracketScreenState extends State<BracketScreen> {
  TournamentDetail? _data;
  late final VoidCallback _unsubscribe;

  @override
  void initState() {
    super.initState();
    _load();
    // Redraw when a match starts / ends or the next round is drawn
    _unsubscribe = SocketService.instance.on('tournament:updated', (d) {
      if (d['tournament_id'] == widget.tournamentId) _load();
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await TournamentApi.detail(widget.tournamentId);
      if (mounted) setState(() => _data = data);
    } catch (err) {
      showToast('Could not load the bracket', message: errorText(err), kind: ToastKind.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    if (data == null) {
      return const Scaffold(body: AppBackground(child: Column(children: [AppHeader(title: 'Bracket'), Expanded(child: LoadingView(message: 'Loading bracket…'))])));
    }

    final t = data.tournament;
    final me = context.watch<AuthState>().player?.playerId;
    final matchCount = data.rounds.fold(0, (n, r) => n + r.matches.length);
    final subtitle = data.preview
        ? '${t.name} · preview for ${t.maxParticipants} players'
        : '${t.name} · ${data.participants.length} players · ${data.rounds.length} rounds · $matchCount matches';

    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          AppHeader(title: 'Bracket', subtitle: subtitle),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
            child: Text.rich(
              TextSpan(style: const TextStyle(color: AppColors.textDim, fontSize: 12.5, height: 1.4), children: [
                TextSpan(text: '${data.preview ? 'Round 1 is drawn when the tournament starts. ' : ''}Winners move right → 👑 champion. '),
                const TextSpan(text: 'Gold', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w800)),
                const TextSpan(text: ' = your matches. Pinch to zoom out.'),
              ]),
            ),
          ),
          Expanded(
            child: data.rounds.isNotEmpty
                ? BracketTree(
                    rounds: data.rounds,
                    myPlayerId: me,
                    preview: data.preview,
                    onOpenMatch: (matchId) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => GameScreen(matchId: matchId))),
                  )
                : const Padding(
                    padding: EdgeInsets.fromLTRB(24, 40, 24, 0),
                    child: Text('No bracket: this tournament was cancelled before it started.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
                  ),
          ),
        ]),
      ),
    );
  }
}
