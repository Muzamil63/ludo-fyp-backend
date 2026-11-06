// Tournaments tab: browse open / live tournaments, my tournaments, and my upcoming tournament matches.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../api/socket_service.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/refresh_on_return.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/tournament_card.dart';
import '../game/game_screen.dart';
import '../main_tabs.dart';
import 'tournament_detail_screen.dart';
import 'tournament_form_screen.dart';

class TournamentsScreen extends StatefulWidget {
  const TournamentsScreen({super.key});
  @override
  State<TournamentsScreen> createState() => _TournamentsScreenState();
}

class _TournamentsScreenState extends State<TournamentsScreen> with RefreshOnReturn {
  String _tab = 'browse';
  List<Tournament> _browse = [];
  List<Tournament> _mine = [];
  List<UpcomingMatch> _matches = [];
  final List<VoidCallback> _unsubscribe = [];

  @override
  void initState() {
    super.initState();
    _load();
    MainTabs.selectedTab.addListener(_onTab);
    _unsubscribe.add(SocketService.instance.on('tournament:updated', (_) => _load()));
    _unsubscribe.add(SocketService.instance.on('tournament:match_ready', (_) => _load()));
  }

  @override
  void dispose() {
    MainTabs.selectedTab.removeListener(_onTab);
    for (final off in _unsubscribe) {
      off();
    }
    super.dispose();
  }

  void _onTab() {
    if (MainTabs.selectedTab.value == 1) _load();
  }

  @override
  void onReturn() => _load();

  Future<void> _load() async {
    if (context.read<AuthState>().isGuest) return;
    try {
      final all = await TournamentApi.list();
      final mine = await TournamentApi.mine();
      final matches = await TournamentApi.myMatches();
      if (!mounted) return;
      setState(() {
        _browse = all.where((t) => t.status == 'registration' || t.status == 'in_progress').toList();
        _mine = mine;
        _matches = matches;
      });
    } catch (_) {
      // keep the old lists
    }
  }

  void _push(Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

  Widget _matchCard(UpcomingMatch m) {
    final left = m.scheduledAt.difference(DateTime.now());
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      highlight: m.status == 'in_progress' ? AppColors.danger : AppColors.gold,
      onTap: () => _push(GameScreen(matchId: m.matchId)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(m.tournamentName, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.heading)),
          StatusPill(status: m.status, label: m.status == 'in_progress' ? 'Live' : null),
        ]),
        const SizedBox(height: 6),
        Text('Round ${m.roundNo} · Match ${m.matchNo}', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(
          m.status == 'in_progress' ? 'Playing now — tap to join!' : left.inSeconds > 0 ? 'Starts in ${formatCountdown(left)} (${formatTime(m.scheduledAt)})' : 'Starting now…',
          style: AppText.dim,
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (auth.isGuest) {
      return AppBackground(
        safeBottom: false,
        child: Column(children: [
          const AppHeader(title: 'Tournaments', back: false),
          EmptyState(
            emoji: '🏆',
            title: 'Tournaments need an account',
            text: 'Create a free account to join knockout cups, invite friends and win trophies.',
            actionLabel: 'Create Account',
            onAction: () async {
              if (await confirmDialog(context, 'Leave guest mode?', 'You will go back to the start screen to create your account.', yes: 'Continue')) {
                auth.logout();
              }
            },
          ),
        ]),
      );
    }

    final list = _tab == 'browse' ? _browse : _mine;
    return AppBackground(
      safeBottom: false,
      child: Column(children: [
        AppHeader(
          title: 'Tournaments',
          back: false,
          right: SizedBox(
            width: 110,
            child: GradientButton(title: 'Create', icon: Icons.add, size: ButtonSize.sm, variant: ButtonVariant.gold, onPressed: () => _push(const TournamentFormScreen())),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: OptionPicker<String>(
            value: _tab,
            options: [const Option('Browse', 'browse'), const Option('Mine', 'mine'), Option(_matches.isEmpty ? 'Matches' : 'Matches (${_matches.length})', 'matches')],
            onChanged: (t) => setState(() => _tab = t),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: AppColors.gold,
            onRefresh: _load,
            child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 30), children: [
              if (_tab == 'matches') ...[
                if (_matches.isEmpty) const EmptyState(emoji: '📅', title: 'No upcoming matches', text: 'When a tournament you joined starts, your matches show up here.'),
                for (final m in _matches) _matchCard(m),
              ] else ...[
                if (list.isEmpty)
                  EmptyState(
                    emoji: _tab == 'browse' ? '🎪' : '🎯',
                    title: _tab == 'browse' ? 'No open tournaments' : 'No tournaments yet',
                    text: _tab == 'browse' ? 'Be the first — create one and invite your friends!' : 'Join one from Browse, or create your own.',
                    actionLabel: 'Create Tournament',
                    onAction: () => _push(const TournamentFormScreen()),
                  ),
                for (final t in list) TournamentCard(t: t, onTap: () => _push(TournamentDetailScreen(tournamentId: t.tournamentId))),
              ],
            ]),
          ),
        ),
      ]),
    );
  }
}
