// Online matchmaking: joins the queue, shows a searching animation, opens the board when matched.
import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../api/socket_service.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/token_piece.dart';
import 'game_screen.dart';

class MatchmakingScreen extends StatefulWidget {
  final String queueKey; // ffa2 | ffa4 | 2v2
  const MatchmakingScreen({super.key, required this.queueKey});
  @override
  State<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends State<MatchmakingScreen> with SingleTickerProviderStateMixin {
  static const _titles = {'ffa2': '1 vs 1', 'ffa4': '4 Players', '2v2': '2 vs 2 Teams'};
  final _socket = SocketService.instance;
  late final AnimationController _spin = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
  late int _needed = widget.queueKey == 'ffa2' ? 2 : 4;
  int _waiting = 1;
  int _seconds = 0;
  bool _joined = false;
  bool _matched = false;
  Timer? _clock;
  final List<VoidCallback> _unsubscribe = [];

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _seconds++));
    _unsubscribe.add(_socket.on('queue:waiting', (d) {
      if (d['queue_key'] != widget.queueKey) return;
      setState(() {
        _waiting = d['waiting'] as int;
        _needed = d['needed'] as int;
      });
    }));
    _unsubscribe.add(_socket.on('queue:matched', (d) => _openGame(d['match_id'] as int)));
    _socket.connected.addListener(_join);
    _join();
  }

  // Join the queue once the socket is connected.
  Future<void> _join() async {
    if (_joined || !_socket.connected.value) return;
    _joined = true;
    try {
      final res = await _socket.emitAck('queue:join', {'queue_key': widget.queueKey});
      if (res['matched'] == true && res['match_id'] != null) _openGame(res['match_id'] as int);
    } catch (err) {
      showError(err);
      if (mounted) Navigator.of(context).pop();
    }
  }

  void _openGame(int matchId) {
    if (_matched || !mounted) return;
    _matched = true;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => GameScreen(matchId: matchId)));
  }

  @override
  void dispose() {
    if (!_matched) _socket.emitAck('queue:leave').catchError((_) => null); // leave the queue when cancelled
    _socket.connected.removeListener(_join);
    for (final off in _unsubscribe) {
      off();
    }
    _clock?.cancel();
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const size = 240.0;
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          Expanded(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_titles[widget.queueKey]!.toUpperCase(), style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, letterSpacing: 2)),
              const SizedBox(height: 6),
              const Text('Finding players…', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
              const SizedBox(height: 36),
              SizedBox(
                width: size + 60,
                height: size + 60,
                child: Stack(alignment: Alignment.center, children: [
                  // 4 tokens circling around the counter
                  AnimatedBuilder(
                    animation: _spin,
                    builder: (context, _) => Stack(children: [
                      for (var i = 0; i < 4; i++)
                        Builder(builder: (context) {
                          final a = _spin.value * 2 * pi + i * pi / 2;
                          return Positioned(
                            left: (size + 60) / 2 + cos(a) * size / 2 - 27,
                            top: (size + 60) / 2 + sin(a) * size / 2 - 27,
                            child: TokenPiece(color: LudoColor.values[i], size: 54),
                          );
                        }),
                    ]),
                  ),
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary.withAlpha(64), border: Border.all(color: AppColors.primary, width: 2)),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text('$_waiting/$_needed', style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900)),
                      const Text('players', style: AppText.dim),
                    ]),
                  ),
                ]),
              ),
              const SizedBox(height: 24),
              Text('${_seconds ~/ 60}:${(_seconds % 60).toString().padLeft(2, '0')}',
                  style: const TextStyle(color: AppColors.textDim, fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              ValueListenableBuilder<bool>(
                valueListenable: _socket.connected,
                builder: (context, ok, _) => Text(ok ? 'Waiting for other players to join this queue.' : 'Connecting to the game server…', style: AppText.small),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: GradientButton(title: 'Cancel', icon: Icons.close, variant: ButtonVariant.ghost, onPressed: () => Navigator.of(context).pop()),
          ),
        ]),
      ),
    );
  }
}
