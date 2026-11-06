// Room lobby: big room code (copy it), seats filling up live, invite friends, host starts the game.
// Closing this screen (back or "Leave") = leaving the room, unless the game has started.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../api/socket_service.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/invite_friends_sheet.dart';
import '../game/game_screen.dart';

class RoomLobbyScreen extends StatefulWidget {
  final int matchId;
  final String roomCode;
  const RoomLobbyScreen({super.key, required this.matchId, required this.roomCode});
  @override
  State<RoomLobbyScreen> createState() => _RoomLobbyScreenState();
}

class _RoomLobbyScreenState extends State<RoomLobbyScreen> {
  static const _seatsFor = {2: [1, 3], 3: [1, 2, 3], 4: [1, 2, 3, 4]};
  static const _seatColor = {1: LudoColor.red, 2: LudoColor.green, 3: LudoColor.yellow, 4: LudoColor.blue};

  final _socket = SocketService.instance;
  final List<VoidCallback> _unsubscribe = [];
  MatchState? _state;
  bool _fillBots = true;
  bool _starting = false;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _unsubscribe.add(_socket.on('room:updated', (d) {
      if (!mounted || d['match_id'] != widget.matchId) return;
      if (d['status'] == 'cancelled') {
        _roomClosed();
        return;
      }
      if (_state == null) return;
      setState(() => _state!.seats
        ..clear()
        ..addAll((d['seats'] as List).map((s) => Seat.fromJson(Map<String, dynamic>.from(s as Map)))));
    }));
    _unsubscribe.add(_socket.on('match:state', (d) {
      if (mounted && d['match_id'] == widget.matchId && d['match']['status'] == 'in_progress') _openGame();
    }));
    _socket.connected.addListener(_join);
    _join();
  }

  Future<void> _join() async {
    if (!_socket.connected.value || _state != null) return;
    try {
      final data = await _socket.emitAck('match:join', {'match_id': widget.matchId});
      final s = MatchState.fromJson(Map<String, dynamic>.from(data as Map));
      if (s.match.status == 'in_progress') return _openGame();
      if (mounted) setState(() => _state = s);
    } catch (err) {
      showError(err);
      if (mounted) Navigator.of(context).pop();
    }
  }

  void _openGame() {
    if (_started || !mounted) return;
    _started = true;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => GameScreen(matchId: widget.matchId)));
  }

  Future<void> _roomClosed() async {
    _started = true; // nothing to leave any more
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.sheet,
        title: const Text('Room closed', style: TextStyle(color: Colors.white)),
        content: const Text('The host left, so the room was closed.', style: AppText.dim),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
      ),
    );
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    _socket.connected.removeListener(_join);
    if (!_started) {
      RoomApi.leave(widget.matchId).catchError((_) {});
      _socket.emitAck('match:leave', {'match_id': widget.matchId}).catchError((_) => null);
    }
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _starting = true);
    try {
      await RoomApi.start(widget.matchId, _fillBots); // everyone gets "match:state" → the game opens
    } catch (err) {
      showError(err);
      if (mounted) setState(() => _starting = false);
    }
  }

  Widget _seatCard(int no, Seat? seat, int? hostId, int? myId) {
    final shade = ludoShades[_seatColor[no]!]!;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(22), border: Border.all(color: shade.main, width: 2), color: Colors.white.withAlpha(13)),
      child: Column(children: [
        if (seat != null) ...[
          AvatarCircle(name: seat.displayName, size: 46, ring: shade.main),
          const SizedBox(height: 8),
          Text(seat.playerId == myId ? 'You' : seat.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
          if (seat.playerId == hostId) const Text('HOST', style: TextStyle(color: AppColors.gold, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1)),
        ] else ...[
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: shade.main, width: 2)),
            child: const Center(child: Text('?', style: TextStyle(color: AppColors.textMuted, fontSize: 22, fontWeight: FontWeight.w900))),
          ),
          const SizedBox(height: 8),
          const Text('Waiting…', style: TextStyle(color: AppColors.textMuted)),
        ],
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final s = _state;
    if (s == null) {
      return Scaffold(body: AppBackground(child: Column(children: [AppHeader(title: 'Room ${widget.roomCode}'), const Expanded(child: LoadingView(message: 'Opening the room…'))])));
    }
    final myId = auth.player?.playerId;
    final isHost = s.match.hostId == myId;
    final seatNos = _seatsFor[s.match.maxPlayers]!;
    final emptySeats = seatNos.length - s.seats.length;

    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          AppHeader(title: 'Room Lobby', subtitle: '${s.match.ruleSet.name} rules · ${s.match.gameMode == '2v2' ? '2 vs 2' : 'Free for all'}'),
          Expanded(
            child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 40), children: [
              GlassCard(
                highlight: AppColors.gold,
                child: Column(children: [
                  const Text('ROOM CODE', style: TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w800, letterSpacing: 3, fontSize: 12)),
                  const SizedBox(height: 8),
                  Text(widget.roomCode, style: const TextStyle(color: AppColors.gold, fontSize: 44, fontWeight: FontWeight.w900, letterSpacing: 8)),
                  const SizedBox(height: 8),
                  GradientButton(
                    title: 'Copy code',
                    icon: Icons.copy,
                    size: ButtonSize.sm,
                    variant: ButtonVariant.ghost,
                    expand: false,
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: widget.roomCode));
                      showToast('Room code copied', message: 'Send it to your friends', kind: ToastKind.success);
                    },
                  ),
                ]),
              ),
              SectionTitle('Players (${s.seats.length}/${seatNos.length})'),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [for (final no in seatNos) _seatCard(no, s.seats.where((x) => x.seatNo == no).firstOrNull, s.match.hostId, myId)],
              ),
              const SizedBox(height: 14),
              if (isHost)
                GlassCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    if (emptySeats > 0)
                      OptionPicker<bool>(
                        label: '$emptySeats empty seat${emptySeats > 1 ? 's' : ''}',
                        value: _fillBots,
                        options: const [Option('🤖 Fill with bots', true), Option('Leave empty', false)],
                        onChanged: (v) => setState(() => _fillBots = v),
                      ),
                    GradientButton(
                      title: 'Invite Friends',
                      icon: Icons.person_add,
                      variant: ButtonVariant.ghost,
                      onPressed: () => showInviteFriendsSheet(
                        context,
                        excludeIds: [for (final seat in s.seats) seat.playerId ?? 0],
                        onInvite: (id) => RoomApi.invite(widget.matchId, id),
                      ),
                    ),
                    const SizedBox(height: 10),
                    GradientButton(title: 'Start Game', icon: Icons.play_arrow, variant: ButtonVariant.gold, loading: _starting, onPressed: _start),
                  ]),
                )
              else
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text('Waiting for the host to start the game…', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textDim, fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              const SizedBox(height: 18),
              GradientButton(title: isHost ? 'Close Room' : 'Leave Room', icon: Icons.logout, variant: ButtonVariant.danger, size: ButtonSize.md, onPressed: () => Navigator.of(context).pop()),
            ]),
          ),
        ]),
      ),
    );
  }
}
