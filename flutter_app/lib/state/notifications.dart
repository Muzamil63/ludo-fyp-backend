// In-app notifications: snackbars for messages, and live alerts from the server
// (invitations, tournament match ready / started / finished) with a button that opens the right screen.
import 'package:flutter/material.dart';
import '../api/endpoints.dart';
import '../api/socket_service.dart';
import '../screens/game/game_screen.dart';
import '../screens/social/invites_screen.dart';
import '../screens/tournaments/tournament_detail_screen.dart';
import '../theme.dart';
import '../utils/format.dart';

enum ToastKind { success, error, info, invite, trophy }

class Notifications {
  Notifications._();
  static final Notifications instance = Notifications._();

  final navigatorKey = GlobalKey<NavigatorState>();
  final messengerKey = GlobalKey<ScaffoldMessengerState>();
  final ValueNotifier<int> inviteCount = ValueNotifier(0);
  int? activeMatchId; // the game screen tells us which match is open (no alert for it)
  int? myPlayerId;
  bool _started = false;

  static const _icons = {ToastKind.success: '✅', ToastKind.error: '⚠️', ToastKind.info: '🎲', ToastKind.invite: '✉️', ToastKind.trophy: '🏆'};

  void toast(String title, {String? message, ToastKind kind = ToastKind.info, String? actionLabel, VoidCallback? onAction}) {
    final messenger = messengerKey.currentState;
    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(
      backgroundColor: const Color(0xFF1F2860),
      duration: Duration(seconds: onAction != null ? 7 : 3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: kind == ToastKind.error ? AppColors.danger : AppColors.gold.withAlpha(120)),
      ),
      content: Row(children: [
        Text(_icons[kind]!, style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
            if (message != null) Text(message, style: const TextStyle(color: AppColors.textDim, fontSize: 13)),
          ]),
        ),
      ]),
      action: onAction == null ? null : SnackBarAction(label: actionLabel ?? 'Open', textColor: AppColors.gold, onPressed: onAction),
    ));
  }

  void open(Widget page) => navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => page));

  Future<void> refreshInviteCount() async {
    try {
      final rooms = await RoomApi.invitations();
      final tournaments = await TournamentApi.invitations();
      inviteCount.value = rooms.length + tournaments.length;
    } catch (_) {
      // not important enough to show an error
    }
  }

  /// Subscribe once to the server's personal events.
  void start() {
    if (_started) return;
    _started = true;
    final socket = SocketService.instance;

    socket.on('invite:received', (d) {
      inviteCount.value++;
      toast('${d['sender']['display_name']} invited you to a room', message: 'Room code ${d['room_code']}', kind: ToastKind.invite,
          actionLabel: 'Open', onAction: () => open(const InvitesScreen()));
    });

    socket.on('tournament:invited', (d) {
      inviteCount.value++;
      toast('Tournament invite: ${d['tournament_name']}', message: 'from ${d['sender']['display_name']}', kind: ToastKind.invite,
          actionLabel: 'Open', onAction: () => open(const InvitesScreen()));
    });

    socket.on('tournament:match_ready', (d) {
      final matchId = d['match_id'] as int;
      if (activeMatchId == matchId) return;
      final at = DateTime.parse(d['scheduled_at'] as String).toLocal();
      toast('Round ${d['round_no']}: your match is ready', message: 'Starts at ${formatTime(at)} — join the lobby early!',
          kind: ToastKind.trophy, actionLabel: 'Go', onAction: () => open(GameScreen(matchId: matchId)));
    });

    socket.on('tournament:match_started', (d) {
      final matchId = d['match_id'] as int;
      if (activeMatchId == matchId) return;
      toast('Your tournament match has started!', message: 'Round ${d['round_no']}', kind: ToastKind.trophy,
          actionLabel: 'Play', onAction: () => open(GameScreen(matchId: matchId)));
    });

    socket.on('tournament:updated', (d) {
      final id = d['tournament_id'] as int;
      void view() => open(TournamentDetailScreen(tournamentId: id));
      switch (d['reason']) {
        case 'finished':
          final won = d['champion_id'] == myPlayerId;
          toast(won ? 'You are the champion! 🏆' : 'Tournament finished', kind: ToastKind.trophy, actionLabel: 'View', onAction: view);
        case 'cancelled':
          toast('A tournament was cancelled', kind: ToastKind.error, actionLabel: 'View', onAction: view);
        case 'removed':
          toast('You were removed from a tournament', kind: ToastKind.error);
        case 'started':
          toast('Your tournament has started!', message: 'Round 1 has been drawn', kind: ToastKind.trophy, actionLabel: 'View', onAction: view);
      }
    });
  }
}

/// Short helpers so screens can write `showToast('Saved')`.
void showToast(String title, {String? message, ToastKind kind = ToastKind.info}) =>
    Notifications.instance.toast(title, message: message, kind: kind);
void showError(Object err) => Notifications.instance.toast(err.toString(), kind: ToastKind.error);
