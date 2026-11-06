// The Ludo match screen. Joins the match over Socket.IO, shows board / dice / players, sends "roll" and
// "move" to the server and updates the board from the server's events (the server decides everything).
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../api/api_client.dart';
import '../../api/socket_service.dart';
import '../../game/rules.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/dice_view.dart';
import '../../widgets/ludo_board.dart';
import '../../widgets/player_panel.dart';
import '../tournaments/tournament_detail_screen.dart';
import 'result_dialog.dart';
import 'tournament_lobby.dart';

class GameScreen extends StatefulWidget {
  final int matchId;
  const GameScreen({super.key, required this.matchId});
  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  static const _clockwise = LudoColor.values; // red → green → yellow → blue

  final _socket = SocketService.instance;
  final List<VoidCallback> _unsubscribe = [];
  MatchState? _state;
  String? _error;
  int? _deadline;
  List<int> _movable = [];
  bool _rolling = false;
  int? _dice;
  final Map<int, int> _lastRolls = {};
  List<int> _present = [];
  DateTime _rollStart = DateTime.now();
  bool _resultShown = false;

  int? get _myPlayerId => context.read<AuthState>().player?.playerId;
  MatchInfo? get _match => _state?.match;
  Seat? get _mySeat => _state?.seats.where((s) => s.playerId == _myPlayerId).firstOrNull;
  bool get _isMyTurn => _match?.status == 'in_progress' && _mySeat != null && _match!.currentSeat == _mySeat!.seatNo;
  bool get _canRoll => _isMyTurn && _match!.diceValue == null && !_rolling && _movable.isEmpty;

  @override
  void initState() {
    super.initState();
    Notifications.instance.activeMatchId = widget.matchId;
    _listen('match:state', (d) => _applyState(MatchState.fromJson(Map<String, dynamic>.from(d as Map))));
    _listen('game:turn', _onTurn);
    _listen('game:rolled', _onRolled);
    _listen('game:moved', _onMoved);
    _listen('match:finished', _onFinished);
    _listen('tournament:lobby', (d) => setState(() => _present = List<int>.from(d['present_player_ids'] as List)));
    _listen('match:cancelled', (_) => _onCancelled());
    _socket.connected.addListener(_onConnection);
    _join();
  }

  // Only handle events of THIS match (the socket can still be in other match rooms).
  void _listen(String event, void Function(dynamic) handler) {
    _unsubscribe.add(_socket.on(event, (d) {
      if (mounted && d is Map && d['match_id'] == widget.matchId) handler(d);
    }));
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    _socket.connected.removeListener(_onConnection);
    if (Notifications.instance.activeMatchId == widget.matchId) Notifications.instance.activeMatchId = null;
    _socket.emitAck('match:leave', {'match_id': widget.matchId}).catchError((_) => null);
    super.dispose();
  }

  void _onConnection() {
    if (_socket.connected.value) _join(); // re-join after a reconnect
  }

  // ---------- load / reload the full match ----------
  Future<void> _join() async {
    if (!_socket.connected.value) return;
    try {
      final data = await _socket.emitAck('match:join', {'match_id': widget.matchId});
      if (mounted) _applyState(MatchState.fromJson(Map<String, dynamic>.from(data as Map)));
    } catch (err) {
      if (mounted && _state == null) setState(() => _error = errorText(err));
    }
  }

  void _applyState(MatchState s) {
    setState(() {
      _state = s;
      _error = null;
      _deadline = s.turnDeadline;
      // After a reconnect it may be my turn with the dice already rolled: show my movable tokens again.
      final me = _mySeat;
      if (me != null && s.match.currentSeat == me.seatNo && s.match.diceValue != null) {
        _movable = movableTokenIds(s.tokens.where((t) => t.seatNo == me.seatNo).toList(), s.match.diceValue!, s.match.ruleSet);
        _dice = s.match.diceValue;
      }
    });
    if (s.match.status == 'finished') {
      _showResults([
        for (final seat in s.seats.where((x) => x.finishPosition != null))
          Ranking(seatNo: seat.seatNo, playerId: seat.playerId, botId: seat.botId, displayName: seat.displayName, finishPosition: seat.finishPosition!),
      ]);
    }
  }

  // ---------- server events ----------
  void _onTurn(dynamic d) {
    setState(() {
      _match!.currentSeat = d['seat_no'] as int;
      _match!.diceValue = null;
      _deadline = d['deadline'] as int?;
      _movable = [];
    });
    if (_mySeat != null && d['seat_no'] == _mySeat!.seatNo) HapticFeedback.mediumImpact();
  }

  void _onRolled(dynamic d) {
    final seatNo = d['seat_no'] as int;
    final value = d['dice_value'] as int;
    final valid = List<int>.from(d['valid_token_ids'] as List);
    final mine = _mySeat != null && seatNo == _mySeat!.seatNo;
    if (!_rolling) {
      _rollStart = DateTime.now();
      setState(() => _rolling = true);
    }
    // Let the dice spin for at least ~0.6 s so everyone sees the roll
    final wait = max(0, 600 - DateTime.now().difference(_rollStart).inMilliseconds);
    Future.delayed(Duration(milliseconds: wait), () {
      if (!mounted || _state == null) return;
      setState(() {
        _rolling = false;
        _dice = value;
        _lastRolls[seatNo] = value;
        // No valid move = the turn is already passing on the server (current seat unknown until "game:turn")
        final passing = valid.isEmpty;
        _match!.diceValue = passing ? null : value;
        if (passing) _match!.currentSeat = null;
        if (mine) _movable = valid;
      });
      if (mine && valid.isEmpty) showToast('You rolled $value', message: 'No token can move — turn passes');
    });
  }

  void _onMoved(dynamic d) {
    final capturedId = d['captured_token_id'] as int?;
    final mine = _mySeat != null && d['seat_no'] == _mySeat!.seatNo;
    setState(() {
      for (final t in _state!.tokens) {
        if (t.tokenId == d['token_id']) t.position = d['to_position'] as int;
        if (capturedId != null && t.tokenId == capturedId) t.position = -1;
      }
      if (mine) _movable = [];
    });
    if (mine && d['is_auto'] == true) showToast("Time's up!", message: 'The server moved a token for you');
    if (capturedId != null) HapticFeedback.heavyImpact();
  }

  void _onFinished(dynamic d) {
    final rankings = (d['rankings'] as List).map((r) => Ranking.fromJson(Map<String, dynamic>.from(r as Map))).toList();
    setState(() {
      _match!.status = 'finished';
      _match!.currentSeat = null;
      _movable = [];
      for (final seat in _state!.seats) {
        seat.finishPosition = rankings.where((r) => r.seatNo == seat.seatNo).firstOrNull?.finishPosition;
      }
    });
    _showResults(rankings);
  }

  Future<void> _onCancelled() async {
    setState(() => _match!.status = 'cancelled');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.sheet,
        title: const Text('Match cancelled', style: TextStyle(color: Colors.white)),
        content: const Text('The organiser cancelled this tournament.', style: AppText.dim),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
      ),
    );
    if (mounted) Navigator.of(context).pop();
  }

  void _showResults(List<Ranking> rankings) {
    if (_resultShown || _state == null) return;
    _resultShown = true;
    final match = _match!;
    showResultDialog(
      context,
      rankings: rankings,
      seats: _state!.seats,
      myPlayerId: _myPlayerId,
      isTournament: match.matchType == 'tournament',
      onHome: () => Navigator.of(context).popUntil((r) => r.isFirst),
      onTournament: match.tournamentId == null
          ? null
          : () {
              Navigator.of(context).pop(); // close the dialog
              Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => TournamentDetailScreen(tournamentId: match.tournamentId!)));
            },
    );
  }

  // ---------- my actions ----------
  Future<void> _roll() async {
    if (!_canRoll) return;
    _rollStart = DateTime.now();
    setState(() => _rolling = true);
    try {
      await _socket.emitAck('game:roll', {'match_id': widget.matchId}); // the result arrives as "game:rolled"
    } catch (err) {
      setState(() => _rolling = false);
      showError(err);
    }
  }

  Future<void> _move(int tokenId) async {
    if (!_movable.contains(tokenId)) return;
    setState(() => _movable = []);
    try {
      await _socket.emitAck('game:move', {'match_id': widget.matchId, 'token_id': tokenId});
    } catch (err) {
      showError(err);
      _join(); // get the real state back from the server
    }
  }

  // Ask before leaving a running match (the server keeps playing my turns automatically).
  Future<void> _confirmLeave() async {
    final leave = await confirmDialog(context, 'Leave the match?', 'The match goes on without you — the server will play your turns automatically.', yes: 'Leave');
    if (leave && mounted) Navigator.of(context).pop();
  }

  // ---------- UI ----------
  String _statusText(Seat? current) {
    final m = _match!;
    if (m.status == 'waiting') return m.matchType == 'room' ? 'Waiting for the host to start…' : 'Waiting for the match to start…';
    if (m.status == 'cancelled') return 'Match cancelled';
    if (m.status == 'finished') return 'Match finished';
    if (_isMyTurn) return _rolling ? 'Rolling…' : _movable.isNotEmpty ? 'Tap a glowing token to move it' : 'Your turn — tap the dice!';
    if (current != null) return current.botId != null ? '${current.displayName} is thinking…' : "${current.displayName}'s turn";
    return 'No move — next turn…';
  }

  Widget _panel(Seat? seat, {bool right = false}) {
    if (seat == null) return const Expanded(child: SizedBox());
    final m = _match!;
    return Expanded(
      child: PlayerPanel(
        seat: seat,
        isMe: seat.playerId == _myPlayerId,
        isTurn: m.status == 'in_progress' && seat.seatNo == m.currentSeat,
        deadline: seat.seatNo == m.currentSeat ? _deadline : null,
        turnSeconds: m.ruleSet.turnSeconds,
        lastDice: _lastRolls[seat.seatNo],
        present: m.status == 'waiting' && m.matchType == 'tournament' ? _present.contains(seat.playerId) : null,
        alignRight: right,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null && _state == null) {
      return Scaffold(
        body: AppBackground(
          child: Center(child: EmptyState(emoji: '😕', title: "Can't open this match", text: _error, actionLabel: 'Go back', onAction: () => Navigator.of(context).pop())),
        ),
      );
    }
    if (_state == null) {
      return Scaffold(
        body: AppBackground(
          child: ValueListenableBuilder<bool>(
            valueListenable: _socket.connected,
            builder: (context, ok, _) => LoadingView(message: ok ? 'Joining the match…' : 'Connecting to the game server…'),
          ),
        ),
      );
    }

    final m = _match!;
    final seats = _state!.seats;
    // Put each seat in the screen corner of its colour (my colour is always bottom-left).
    final myColor = _mySeat?.color ?? LudoColor.red;
    final i = _clockwise.indexOf(myColor);
    Seat? corner(int k) => seats.where((s) => s.color == _clockwise[(i + k) % 4]).firstOrNull;
    final current = seats.where((s) => s.seatNo == m.currentSeat).firstOrNull;
    final running = m.status == 'in_progress' && _mySeat != null;

    final title = m.matchType == 'tournament'
        ? 'Round ${m.roundNo} · Match ${m.matchNo}'
        : m.matchType == 'room'
            ? 'Room ${m.roomCode}'
            : matchTypeLabel[m.matchType] ?? 'Match';
    final tokens = m.ruleSet.tokensToWin;

    return PopScope(
      canPop: !running,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmLeave();
      },
      child: Scaffold(
        body: AppBackground(
          child: LayoutBuilder(builder: (context, box) {
            final boardSize = min(min(box.maxWidth - 28, box.maxHeight - 300), 460.0);
            return Column(children: [
              AppHeader(
                title: title,
                subtitle: '${m.ruleSet.name} rules · $tokens token${tokens > 1 ? 's' : ''} home to win${m.gameMode == '2v2' ? ' · 2 vs 2' : ''}',
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(children: [_panel(corner(1)), const SizedBox(width: 10), _panel(corner(2), right: true)]),
              ),
              Expanded(
                child: Center(
                  child: Stack(alignment: Alignment.center, children: [
                    LudoBoard(
                      size: boardSize,
                      tokens: _state!.tokens,
                      myColor: _mySeat?.color,
                      activeColor: m.status == 'in_progress' ? current?.color : null,
                      movableTokenIds: _movable,
                      onTokenTap: _move,
                    ),
                    if (m.status == 'waiting' && m.matchType == 'tournament')
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 22),
                        child: TournamentLobby(match: m, seats: seats, presentIds: _present, myPlayerId: _myPlayerId),
                      ),
                  ]),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(_statusText(current),
                    style: TextStyle(color: _isMyTurn ? AppColors.gold : AppColors.textDim, fontSize: _isMyTurn ? 17 : 15, fontWeight: FontWeight.w800)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Row(children: [
                  _panel(corner(0)),
                  SizedBox(
                    width: 100,
                    child: Center(
                      child: DiceView(
                        value: _dice,
                        rolling: _rolling,
                        onTap: _canRoll ? _roll : null,
                        glowColor: current != null ? ludoShades[current.color]!.main : AppColors.gold,
                        size: 58,
                      ),
                    ),
                  ),
                  _panel(corner(3), right: true),
                ]),
              ),
            ]);
          }),
        ),
      ),
    );
  }
}
