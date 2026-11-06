// My invitations: room invites (join the lobby) and tournament invites (join the tournament).
import 'package:flutter/material.dart';
import '../../api/endpoints.dart';
import '../../api/socket_service.dart';
import '../../models.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/gradient_button.dart';
import '../rooms/room_lobby_screen.dart';
import '../tournaments/tournament_detail_screen.dart';

class InvitesScreen extends StatefulWidget {
  const InvitesScreen({super.key});
  @override
  State<InvitesScreen> createState() => _InvitesScreenState();
}

class _InvitesScreenState extends State<InvitesScreen> {
  List<RoomInvite> _rooms = [];
  List<TournamentInvite> _tournaments = [];
  bool _loaded = false;
  String? _busy;
  final List<VoidCallback> _unsubscribe = [];

  @override
  void initState() {
    super.initState();
    _load();
    _unsubscribe.add(SocketService.instance.on('invite:received', (_) => _load()));
    _unsubscribe.add(SocketService.instance.on('tournament:invited', (_) => _load()));
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final rooms = await RoomApi.invitations();
      final tournaments = await TournamentApi.invitations();
      if (mounted) {
        setState(() {
          _rooms = rooms;
          _tournaments = tournaments;
          _loaded = true;
        });
      }
    } catch (err) {
      showError(err);
    }
    Notifications.instance.refreshInviteCount();
  }

  Future<void> _answerRoom(RoomInvite inv, String action) async {
    setState(() => _busy = 'r${inv.invitationId}');
    try {
      final res = await RoomApi.respond(inv.invitationId, action);
      if (action == 'accept' && mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => RoomLobbyScreen(matchId: res['match_id'] as int, roomCode: res['room_code'] as String),
        ));
        return;
      }
      await _load();
    } catch (err) {
      showError(err);
      await _load();
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _answerTournament(TournamentInvite inv, String action) async {
    setState(() => _busy = 't${inv.invitationId}');
    try {
      await TournamentApi.respond(inv.invitationId, action);
      if (action == 'accept' && mounted) {
        showToast('You joined ${inv.tournamentName}!', kind: ToastKind.success);
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => TournamentDetailScreen(tournamentId: inv.tournamentId)));
        return;
      }
      await _load();
    } catch (err) {
      showError(err);
      await _load();
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Widget _buttons(String key, VoidCallback onDecline, VoidCallback onAccept, String acceptLabel) => Padding(
        padding: const EdgeInsets.only(top: 14),
        child: Row(children: [
          Expanded(child: GradientButton(title: 'Decline', icon: Icons.close, variant: ButtonVariant.ghost, size: ButtonSize.md, onPressed: onDecline)),
          const SizedBox(width: 10),
          Expanded(child: GradientButton(title: acceptLabel, icon: Icons.check, variant: ButtonVariant.gold, size: ButtonSize.md, loading: _busy == key, onPressed: onAccept)),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          const AppHeader(title: 'Invitations'),
          Expanded(
            child: !_loaded
                ? const LoadingView()
                : RefreshIndicator(
                    color: AppColors.gold,
                    onRefresh: _load,
                    child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 40), children: [
                      if (_rooms.isEmpty && _tournaments.isEmpty)
                        const EmptyState(emoji: '📭', title: 'No invitations', text: 'When friends invite you to a room or a tournament, it shows up here.'),
                      if (_tournaments.isNotEmpty) const SectionTitle('Tournaments'),
                      for (final inv in _tournaments)
                        GlassCard(
                          margin: const EdgeInsets.only(bottom: 12),
                          highlight: AppColors.gold,
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('🏆 ${inv.tournamentName}', style: AppText.heading),
                            const SizedBox(height: 4),
                            Text('${inv.senderName} invited you · ${inv.playersPerMatch == 2 ? '1 vs 1' : '4 players'} · ${inv.maxParticipants} players', style: AppText.dim),
                            Text('Starts ${formatDateTime(inv.startTime)}', style: AppText.dim),
                            _buttons('t${inv.invitationId}', () => _answerTournament(inv, 'decline'), () => _answerTournament(inv, 'accept'), 'Join'),
                          ]),
                        ),
                      if (_rooms.isNotEmpty) const SectionTitle('Rooms'),
                      for (final inv in _rooms)
                        GlassCard(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('🎲 Room ${inv.roomCode}', style: AppText.heading),
                            const SizedBox(height: 4),
                            Text('${inv.senderName} wants to play with you', style: AppText.dim),
                            _buttons('r${inv.invitationId}', () => _answerRoom(inv, 'decline'), () => _answerRoom(inv, 'accept'), 'Join Room'),
                          ]),
                        ),
                    ]),
                  ),
          ),
        ]),
      ),
    );
  }
}
