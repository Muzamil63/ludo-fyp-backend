// Profile tab: avatar + name (editable), stats, recent matches, leaderboard, server settings, log out.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import '../auth/server_settings_screen.dart';
import '../main_tabs.dart';
import 'leaderboard_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<HistoryMatch> _history = [];

  @override
  void initState() {
    super.initState();
    _load();
    MainTabs.selectedTab.addListener(_onTab);
  }

  @override
  void dispose() {
    MainTabs.selectedTab.removeListener(_onTab);
    super.dispose();
  }

  void _onTab() {
    if (MainTabs.selectedTab.value == 3) _load();
  }

  Future<void> _load() async {
    context.read<AuthState>().refreshMe().catchError((_) {});
    try {
      final history = await UserApi.myMatches();
      if (mounted) setState(() => _history = history);
    } catch (_) {}
  }

  void _push(Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

  // Bottom sheet to pick an emoji avatar and change the display name.
  void _edit(Player player) {
    final name = TextEditingController(text: player.displayName);
    var avatar = player.avatar ?? avatarChoices.first;
    var saving = false;
    showAppSheet(context, title: 'Edit profile', builder: (sheet) {
      return StatefulBuilder(builder: (ctx, setSheet) {
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Padding(padding: EdgeInsets.only(bottom: 10), child: Text('PICK AN AVATAR', style: AppText.label)),
          Wrap(spacing: 10, runSpacing: 10, children: [
            for (final a in avatarChoices)
              InkWell(
                customBorder: const CircleBorder(),
                onTap: () => setSheet(() => avatar = a),
                child: Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: a == avatar ? AppColors.gold.withAlpha(46) : Colors.white.withAlpha(20),
                    border: Border.all(color: a == avatar ? AppColors.gold : Colors.transparent, width: 2),
                  ),
                  child: Text(a, style: const TextStyle(fontSize: 28)),
                ),
              ),
          ]),
          const SizedBox(height: 18),
          AppTextField(label: 'Display name', controller: name, maxLength: 50),
          GradientButton(
            title: 'Save',
            icon: Icons.save,
            variant: ButtonVariant.gold,
            loading: saving,
            onPressed: () async {
              if (name.text.trim().isEmpty) return;
              setSheet(() => saving = true);
              try {
                await UserApi.updateMe(displayName: name.text.trim(), avatar: avatar);
                await context.read<AuthState>().refreshMe();
                if (sheet.mounted) Navigator.of(sheet).pop();
                showToast('Profile updated', kind: ToastKind.success);
              } catch (err) {
                showError(err);
                setSheet(() => saving = false);
              }
            },
          ),
        ]);
      });
    });
  }

  Widget _stat(String value, String label) => Expanded(
        child: Column(children: [
          Text(value, style: const TextStyle(color: AppColors.gold, fontSize: 22, fontWeight: FontWeight.w900)),
          Text(label, style: const TextStyle(color: AppColors.textDim, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      );

  Widget _menu(IconData icon, Color color, String text, VoidCallback onTap) => GlassCard(
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        onTap: onTap,
        child: Row(children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final player = auth.player;
    if (player == null) return const SizedBox();
    final played = player.gamesPlayed;
    final won = player.gamesWon;

    return AppBackground(
      safeBottom: false,
      child: Column(children: [
        const AppHeader(title: 'Profile', back: false),
        Expanded(
          child: RefreshIndicator(
            color: AppColors.gold,
            onRefresh: _load,
            child: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 30), children: [
              GlassCard(
                child: Column(children: [
                  AvatarCircle(avatar: player.avatar, name: player.displayName, size: 84, ring: AppColors.gold),
                  const SizedBox(height: 10),
                  Text(player.displayName, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                  Text(player.isGuest ? 'Guest player' : '@${player.username}', style: AppText.dim),
                  const SizedBox(height: 12),
                  GradientButton(title: 'Edit profile', icon: Icons.edit, size: ButtonSize.sm, variant: ButtonVariant.ghost, expand: false, onPressed: () => _edit(player)),
                ]),
              ),
              if (!player.isGuest)
                GlassCard(
                  margin: const EdgeInsets.only(top: 14),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Row(children: [
                    _stat('$played', 'Played'),
                    _stat('$won', 'Won'),
                    _stat('${played == 0 ? 0 : (won * 100 / played).round()}%', 'Win rate'),
                    _stat('${player.tournamentsWon}', '🏆 Cups'),
                  ]),
                ),
              const SectionTitle('Recent matches'),
              if (_history.isEmpty) const Text('No finished matches yet — go play!', style: AppText.small),
              for (final m in _history.take(10))
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withAlpha(15)))),
                  child: Row(children: [
                    Container(width: 12, height: 12, decoration: BoxDecoration(shape: BoxShape.circle, color: ludoShades[m.color]!.main)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(matchTypeLabel[m.matchType] ?? m.matchType, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                        Text(formatDateTime(m.endedAt), style: AppText.small),
                      ]),
                    ),
                    Text(
                      m.finishPosition == 1 ? '🏆 Won' : m.finishPosition != null ? ordinal(m.finishPosition!) : '-',
                      style: TextStyle(color: m.finishPosition == 1 ? AppColors.gold : AppColors.textDim, fontWeight: FontWeight.w900),
                    ),
                  ]),
                ),
              _menu(Icons.workspace_premium, AppColors.gold, 'Leaderboard', () => _push(const LeaderboardScreen())),
              _menu(Icons.dns, AppColors.info, 'Server settings', () => _push(const ServerSettingsScreen())),
              const SizedBox(height: 20),
              GradientButton(
                title: 'Log Out',
                icon: Icons.logout,
                variant: ButtonVariant.danger,
                size: ButtonSize.md,
                onPressed: () async {
                  final ok = await confirmDialog(context, 'Log out?', player.isGuest ? 'You can come back as the same guest on this phone.' : 'See you soon!', yes: 'Log out');
                  if (ok) auth.logout();
                },
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
