// One tournament: info, the right buttons for me (join / leave / invite / creator controls),
// my next match, the players, the bracket and the champion. Refreshes live on "tournament:updated".
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../api/socket_service.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../state/refresh_on_return.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../utils/pick_date_time.dart';
import '../../widgets/common.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/invite_friends_sheet.dart';
import '../game/game_screen.dart';
import 'bracket_view.dart';
import 'tournament_form_screen.dart';

class TournamentDetailScreen extends StatefulWidget {
  final int tournamentId;
  const TournamentDetailScreen({super.key, required this.tournamentId});
  @override
  State<TournamentDetailScreen> createState() => _TournamentDetailScreenState();
}

class _TournamentDetailScreenState extends State<TournamentDetailScreen> with RefreshOnReturn {
  TournamentDetail? _data;
  String? _busy;
  final List<VoidCallback> _unsubscribe = [];

  @override
  void initState() {
    super.initState();
    _load();
    for (final event in ['tournament:updated', 'tournament:match_ready']) {
      _unsubscribe.add(SocketService.instance.on(event, (d) {
        if (d['tournament_id'] == widget.tournamentId) _load();
      }));
    }
  }

  @override
  void dispose() {
    for (final off in _unsubscribe) {
      off();
    }
    super.dispose();
  }

  @override
  void onReturn() => _load();

  Future<void> _load() async {
    try {
      final data = await TournamentApi.detail(widget.tournamentId);
      if (mounted) setState(() => _data = data);
    } catch (err) {
      showError(err);
    }
  }

  // Runs an action, shows success / error, then reloads the tournament.
  Future<void> _act(String key, Future<void> Function() action, String success) async {
    setState(() => _busy = key);
    try {
      await action();
      showToast(success, kind: ToastKind.success);
      await _load();
    } catch (err) {
      showError(err);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _confirmThen(String title, String message, VoidCallback action) async {
    if (await confirmDialog(context, title, message)) action();
  }

  void _push(Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

  Future<void> _changeTime(BracketMatch m) async {
    final soon = DateTime.now().add(const Duration(minutes: 5));
    final picked = await pickDateTime(context, m.scheduledAt.isAfter(soon) ? m.scheduledAt : soon);
    if (picked == null) return;
    _act('time-${m.matchId}', () => TournamentApi.rescheduleMatch(widget.tournamentId, m.matchId, picked), 'Match time changed — players were told');
  }

  Widget _info(String label, String value) => Container(
        padding: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withAlpha(15)))),
        child: Row(children: [
          Text(label, style: AppText.dim),
          const SizedBox(width: 12),
          Expanded(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final data = _data;
    if (data == null) {
      return const Scaffold(body: AppBackground(child: Column(children: [AppHeader(title: 'Tournament'), Expanded(child: LoadingView(message: 'Loading tournament…'))])));
    }

    final t = data.tournament;
    final me = context.watch<AuthState>().player?.playerId;
    final isCreator = t.creatorId == me;
    final myEntry = data.participants.where((p) => p.playerId == me).firstOrNull;
    final full = data.participants.length >= t.maxParticipants;
    final myMatch = data.rounds.expand((r) => r.matches).where((m) => m.isOpen && m.seats.any((s) => s.playerId == me)).firstOrNull;
    final startsIn = t.startTime.difference(DateTime.now());
    final roundRunning = data.rounds.isNotEmpty && data.rounds.last.matches.any((m) => m.status != 'finished' && m.status != 'cancelled');
    final activeCount = data.participants.where((p) => p.status == 'active').length;
    final nextRoundNote = t.status == 'in_progress' && roundRunning && activeCount > t.playersPerMatch
        ? 'Winners of this round meet here. It is drawn ${t.roundBreakMinutes} min after the last match ends.'
        : null;
    final id = t.tournamentId;

    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          AppHeader(title: t.name, subtitle: 'by @${t.creatorUsername}${isCreator ? ' (you)' : ''}', right: StatusPill(status: t.status)),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.gold,
              onRefresh: _load,
              child: ListView(padding: const EdgeInsets.only(top: 8, bottom: 40), children: [
                // champion
                if (t.status == 'finished' && data.champion != null)
                  GlassCard(
                    margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                    highlight: AppColors.gold,
                    child: Column(children: [
                      const Text('🏆', style: TextStyle(fontSize: 50)),
                      const Text('CHAMPION', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, letterSpacing: 4)),
                      const SizedBox(height: 10),
                      AvatarCircle(avatar: data.champion!.avatar, name: data.champion!.displayName, size: 64, ring: AppColors.gold),
                      const SizedBox(height: 8),
                      Text(data.champion!.playerId == me ? 'You!' : data.champion!.displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22)),
                    ]),
                  ),

                // my next match
                if (myMatch != null)
                  GlassCard(
                    margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                    highlight: myMatch.status == 'in_progress' ? AppColors.danger : AppColors.gold,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Text('YOUR MATCH · ROUND ${myMatch.roundNo}', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
                      const SizedBox(height: 4),
                      Text(
                        myMatch.status == 'in_progress' ? 'Live now!' : 'Starts in ${formatCountdown(myMatch.scheduledAt.difference(DateTime.now()))}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 24),
                      ),
                      const Text('Enter the lobby early: the match starts as soon as everyone is there.', style: AppText.small),
                      const SizedBox(height: 10),
                      GradientButton(
                        title: myMatch.status == 'in_progress' ? 'Play Now' : 'Enter Lobby',
                        icon: Icons.play_arrow,
                        variant: ButtonVariant.gold,
                        onPressed: () => _push(GameScreen(matchId: myMatch.matchId)),
                      ),
                    ]),
                  ),

                // info
                GlassCard(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    if (t.description != null && t.description!.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(t.description!, style: AppText.body)),
                    _info('Format', t.playersPerMatch == 2 ? '1 vs 1 knockout' : '4-player matches, winner advances'),
                    _info('Rules', t.ruleSetName),
                    _info('Players', '${data.participants.length} / ${t.maxParticipants}'),
                    _info(t.status == 'registration' ? 'Starts' : 'Started', formatDateTime(t.startTime)),
                    if (t.status == 'registration') _info('Countdown', startsIn.inSeconds > 0 ? formatCountdown(startsIn) : 'Starting…'),
                    _info('Break between rounds', '${t.roundBreakMinutes} min'),
                    if (t.status == 'in_progress') _info('Current round', '${t.currentRound}'),
                  ]),
                ),

                // actions
                if (t.status == 'registration')
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      if (myEntry == null)
                        GradientButton(
                          title: full ? 'Tournament is full' : 'Join Tournament',
                          icon: Icons.login,
                          variant: ButtonVariant.gold,
                          loading: _busy == 'join',
                          onPressed: full ? null : () => _act('join', () => TournamentApi.join(id), 'You joined the tournament!'),
                        ),
                      if (isCreator || myEntry != null) ...[
                        const SizedBox(height: 10),
                        GradientButton(
                          title: 'Invite Friends',
                          icon: Icons.person_add,
                          onPressed: full
                              ? null
                              : () => showInviteFriendsSheet(context,
                                  excludeIds: [for (final p in data.participants) p.playerId], onInvite: (friendId) => TournamentApi.invite(id, friendId)),
                        ),
                      ],
                      if (myEntry != null) ...[
                        const SizedBox(height: 10),
                        GradientButton(
                          title: 'Leave Tournament',
                          icon: Icons.logout,
                          variant: ButtonVariant.ghost,
                          loading: _busy == 'leave',
                          onPressed: () => _confirmThen('Leave tournament?', 'You can join again before it starts.',
                              () => _act('leave', () => TournamentApi.leave(id), 'You left the tournament')),
                        ),
                      ],
                      if (isCreator)
                        GlassCard(
                          margin: const EdgeInsets.only(top: 14),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            const Text('👑 Creator controls', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 16)),
                            const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Text('It starts by itself at the start time, or start it now.', style: AppText.small)),
                            Row(children: [
                              Expanded(
                                child: GradientButton(
                                  title: 'Edit',
                                  icon: Icons.edit,
                                  variant: ButtonVariant.ghost,
                                  size: ButtonSize.md,
                                  onPressed: () => _push(TournamentFormScreen(tournamentId: id)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: GradientButton(
                                  title: 'Start now',
                                  icon: Icons.bolt,
                                  variant: ButtonVariant.success,
                                  size: ButtonSize.md,
                                  loading: _busy == 'start',
                                  onPressed: data.participants.length < 2
                                      ? null
                                      : () => _confirmThen('Start now?', 'Registration closes and round 1 is drawn.',
                                          () => _act('start', () => TournamentApi.start(id), 'Tournament started! Round 1 drawn')),
                                ),
                              ),
                            ]),
                            if (data.participants.length < 2)
                              const Padding(padding: EdgeInsets.only(top: 6), child: Text('At least 2 players are needed to start.', style: AppText.small)),
                            const SizedBox(height: 10),
                            GradientButton(
                              title: 'Cancel Tournament',
                              icon: Icons.cancel,
                              variant: ButtonVariant.danger,
                              size: ButtonSize.md,
                              loading: _busy == 'cancel',
                              onPressed: () => _confirmThen('Cancel tournament?', 'Everyone will be told. This cannot be undone.',
                                  () => _act('cancel', () => TournamentApi.cancel(id), 'Tournament cancelled')),
                            ),
                          ]),
                        ),
                    ]),
                  ),
                if (t.status == 'in_progress' && myEntry?.status == 'eliminated')
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                    child: Text('You were knocked out in round ${myEntry!.eliminatedRound}. Keep watching the bracket!', textAlign: TextAlign.center, style: AppText.dim),
                  ),
                if (t.status == 'in_progress' && isCreator)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                    child: GradientButton(
                      title: 'Cancel Tournament',
                      icon: Icons.cancel,
                      variant: ButtonVariant.danger,
                      size: ButtonSize.md,
                      loading: _busy == 'cancel',
                      onPressed: () => _confirmThen('Cancel tournament?', 'Running matches will be stopped.',
                          () => _act('cancel', () => TournamentApi.cancel(id), 'Tournament cancelled')),
                    ),
                  ),
                if (t.status == 'cancelled')
                  const Padding(padding: EdgeInsets.only(top: 14), child: Text('This tournament was cancelled.', textAlign: TextAlign.center, style: AppText.dim)),

                // bracket
                if (data.rounds.isNotEmpty) ...[
                  const Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: SectionTitle('Bracket')),
                  BracketView(
                    rounds: data.rounds,
                    myPlayerId: me,
                    isCreator: isCreator && t.status == 'in_progress',
                    nextRoundNote: nextRoundNote,
                    busy: _busy,
                    onPlay: (matchId) => _push(GameScreen(matchId: matchId)),
                    onStartNow: (matchId) => _act('start-$matchId', () => TournamentApi.startMatchNow(id, matchId), 'Match started'),
                    onChangeTime: _changeTime,
                  ),
                ],

                // players
                Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: SectionTitle('Players (${data.participants.length})')),
                for (final p in data.participants)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withAlpha(15)))),
                    child: Row(children: [
                      AvatarCircle(avatar: p.avatar, name: p.displayName, size: 38, dim: p.status == 'eliminated', ring: p.status == 'champion' ? AppColors.gold : null),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${p.displayName}${p.playerId == me ? ' (you)' : ''}${p.playerId == t.creatorId ? ' 👑' : ''}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                          Text('@${p.username}${p.eliminatedRound != null ? ' · out in round ${p.eliminatedRound}' : ''}', style: AppText.small),
                        ]),
                      ),
                      if (t.status != 'registration') StatusPill(status: p.status),
                      if (isCreator && t.status == 'registration' && p.playerId != me)
                        IconButton(
                          icon: const Icon(Icons.close, color: AppColors.danger),
                          onPressed: () => _confirmThen('Remove player?', '${p.displayName} will be removed from the tournament.',
                              () => _act('remove-${p.playerId}', () => TournamentApi.removePlayer(id, p.playerId), 'Player removed')),
                        ),
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
