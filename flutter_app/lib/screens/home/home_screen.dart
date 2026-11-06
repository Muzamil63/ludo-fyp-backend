// Home: player header with invites bell, quick play online, all game modes, next tournament match, stats.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../state/refresh_on_return.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/token_piece.dart';
import '../game/bot_setup_screen.dart';
import '../game/game_screen.dart';
import '../game/matchmaking_screen.dart';
import '../main_tabs.dart';
import '../rooms/create_room_screen.dart';
import '../rooms/join_room_screen.dart';
import '../social/invites_screen.dart';
import '../social/leaderboard_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with RefreshOnReturn {
  List<UpcomingMatch> _upcoming = [];

  @override
  void initState() {
    super.initState();
    _refresh();
    MainTabs.selectedTab.addListener(_onTab);
  }

  @override
  void dispose() {
    MainTabs.selectedTab.removeListener(_onTab);
    super.dispose();
  }

  void _onTab() {
    if (MainTabs.selectedTab.value == 0) _refresh();
  }

  @override
  void onReturn() => _refresh();

  // Refresh stats, invites and my tournament matches.
  Future<void> _refresh() async {
    final auth = context.read<AuthState>();
    auth.refreshMe().catchError((_) {});
    if (auth.isGuest) return;
    Notifications.instance.refreshInviteCount();
    try {
      final upcoming = await TournamentApi.myMatches();
      if (mounted) setState(() => _upcoming = upcoming);
    } catch (_) {}
  }

  void _push(Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  void _needAccount(String what) => showToast('Create an account', message: '$what need a registered account.');

  void _playOnline() {
    showAppSheet(context, title: 'Play Online', builder: (sheet) {
      Widget option(String key, String title, String sub, IconData icon) => GlassCard(
            margin: const EdgeInsets.only(bottom: 10),
            onTap: () {
              Navigator.of(sheet).pop();
              _push(MatchmakingScreen(queueKey: key));
            },
            child: Row(children: [
              Icon(icon, color: AppColors.gold, size: 28),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: AppText.heading),
                  Text(sub, style: AppText.small),
                ]),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textDim),
            ]),
          );
      return Column(children: [
        option('ffa2', '1 vs 1', '2 players, classic rules', Icons.sports_kabaddi),
        option('ffa4', '4 Players', 'Everyone for themselves', Icons.public),
        option('2v2', '2 vs 2 Teams', 'Play with a partner', Icons.groups),
      ]);
    });
  }

  Widget _tile(String title, String subtitle, IconData icon, List<Color> gradient, VoidCallback onTap, {bool locked = false}) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Container(
          height: 130,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
            border: Border.all(color: Colors.white.withAlpha(51)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(color: Colors.black.withAlpha(46), borderRadius: BorderRadius.circular(14)),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
            const Spacer(),
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900, shadows: [Shadow(color: Colors.black26, blurRadius: 4)])),
            Text(locked ? '🔒 Account needed' : subtitle, style: const TextStyle(color: Color(0xE0FFFFFF), fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }

  Widget _stat(String value, String label) => Expanded(
        child: Column(children: [
          Text(value, style: const TextStyle(color: AppColors.gold, fontSize: 22, fontWeight: FontWeight.w900)),
          Text(label, style: const TextStyle(color: AppColors.textDim, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final player = auth.player;
    final guest = auth.isGuest;
    final next = _upcoming.isNotEmpty ? _upcoming.first : null;
    final played = player?.gamesPlayed ?? 0;
    final won = player?.gamesWon ?? 0;

    return AppBackground(
      safeBottom: false,
      child: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.gold,
        child: ListView(padding: const EdgeInsets.fromLTRB(18, 18, 18, 30), children: [
          // header
          Row(children: [
            AvatarCircle(avatar: player?.avatar, name: player?.displayName ?? '?', size: 46, ring: AppColors.gold),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Hello,', style: TextStyle(color: AppColors.textDim, fontSize: 13)),
                Text(player?.displayName ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
              ]),
            ),
            if (!guest)
              ValueListenableBuilder<int>(
                valueListenable: Notifications.instance.inviteCount,
                builder: (context, count, _) => Badge(
                  isLabelVisible: count > 0,
                  label: Text('$count'),
                  backgroundColor: AppColors.danger,
                  child: IconButton.filledTonal(
                    style: IconButton.styleFrom(backgroundColor: Colors.white.withAlpha(26)),
                    icon: const Icon(Icons.notifications_none, color: Colors.white),
                    onPressed: () => _push(const InvitesScreen()),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 18),

          // next tournament match
          if (next != null)
            GlassCard(
              margin: const EdgeInsets.only(bottom: 16),
              highlight: AppColors.gold,
              onTap: () => _push(GameScreen(matchId: next.matchId)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('🏆 ${next.tournamentName} · Round ${next.roundNo}', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w800, fontSize: 13)),
                const SizedBox(height: 4),
                Text(
                  next.status == 'in_progress' ? 'Your match is LIVE — tap to play!' : 'Your match starts in ${formatCountdown(next.scheduledAt.difference(DateTime.now()))}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17),
                ),
                const SizedBox(height: 4),
                const Text('Join the lobby early: it starts as soon as everyone is there.', style: AppText.small),
              ]),
            ),

          // quick play hero
          InkWell(
            borderRadius: BorderRadius.circular(30),
            onTap: _playOnline,
            child: Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF7C5CFF), Color(0xFF4B2BD6), Color(0xFF2A1680)]),
                border: Border.all(color: Colors.white.withAlpha(64), width: 1.5),
              ),
              child: Column(children: [
                Row(mainAxisSize: MainAxisSize.min, children: [for (final c in LudoColor.values) Padding(padding: const EdgeInsets.symmetric(horizontal: 3), child: TokenPiece(color: c, size: 46))]),
                const SizedBox(height: 8),
                const Text('PLAY ONLINE', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: 2)),
                const SizedBox(height: 4),
                const Text('Get matched with real players in seconds', style: TextStyle(color: Color(0xCCFFFFFF), fontSize: 14)),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 34, vertical: 12),
                  decoration: BoxDecoration(color: AppColors.gold, borderRadius: BorderRadius.circular(99)),
                  child: const Text('PLAY NOW', style: TextStyle(color: AppColors.goldText, fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1)),
                ),
              ]),
            ),
          ),

          const SectionTitle('Game modes'),
          Row(children: [
            _tile('vs Computer', 'Practice with bots', Icons.smart_toy, AppGradients.green, () => _push(const BotSetupScreen())),
            const SizedBox(width: 12),
            _tile('Tournaments', 'Knockout cups', Icons.emoji_events, AppGradients.gold,
                () => guest ? _needAccount('Tournaments') : MainTabs.selectedTab.value = 1, locked: guest),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            _tile('Create Room', 'Play with friends', Icons.group_add, AppGradients.blue,
                () => guest ? _needAccount('Private rooms') : _push(const CreateRoomScreen()), locked: guest),
            const SizedBox(width: 12),
            _tile('Join Room', 'Enter a room code', Icons.vpn_key, AppGradients.red, () => _push(const JoinRoomScreen())),
          ]),
          const SizedBox(height: 12),

          GlassCard(
            onTap: () => _push(const LeaderboardScreen()),
            child: const Row(children: [
              Icon(Icons.workspace_premium, color: AppColors.gold, size: 28),
              SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Leaderboard', style: AppText.heading),
                  Text('See the best players', style: AppText.small),
                ]),
              ),
              Icon(Icons.chevron_right, color: AppColors.textDim),
            ]),
          ),

          if (!guest) ...[
            const SizedBox(height: 16),
            GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Row(children: [
                _stat('$played', 'Played'),
                _stat('$won', 'Won'),
                _stat('${played == 0 ? 0 : (won * 100 / played).round()}%', 'Win rate'),
                _stat('${player?.tournamentsWon ?? 0}', 'Trophies'),
              ]),
            ),
          ],
        ]),
      ),
    );
  }
}
