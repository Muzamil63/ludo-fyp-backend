// Friends tab: my friends, friend requests (accept / reject), and search to add new friends.
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import '../main_tabs.dart';

class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});
  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> {
  String _tab = 'friends';
  List<Person> _friends = [];
  List<Person> _received = [];
  List<Person> _sent = [];
  List<Person> _results = [];
  final Set<String> _requested = {};
  final _query = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
    MainTabs.selectedTab.addListener(_onTab);
  }

  @override
  void dispose() {
    MainTabs.selectedTab.removeListener(_onTab);
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _onTab() {
    if (MainTabs.selectedTab.value == 2) _load();
  }

  Future<void> _load() async {
    if (context.read<AuthState>().isGuest) return;
    try {
      final friends = await FriendApi.list();
      final requests = await FriendApi.requests();
      if (!mounted) return;
      setState(() {
        _friends = friends;
        _received = requests.received;
        _sent = requests.sent;
      });
    } catch (_) {}
  }

  // Search as you type (waits 350 ms after the last key press)
  void _search(String text) {
    _debounce?.cancel();
    if (text.trim().isEmpty) return setState(() => _results = []);
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      try {
        final results = await UserApi.search(text.trim());
        if (mounted) setState(() => _results = results);
      } catch (_) {}
    });
  }

  Future<void> _run(Future<void> Function() action, String success) async {
    try {
      await action();
      showToast(success, kind: ToastKind.success);
      await _load();
    } catch (err) {
      showError(err);
    }
  }

  Widget _row(Person p, Widget trailing) => Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withAlpha(18)))),
        child: Row(children: [
          AvatarCircle(avatar: p.avatar, name: p.displayName, size: 42),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
              Text('@${p.username}', style: AppText.small),
            ]),
          ),
          trailing,
        ]),
      );

  Widget _circleButton(IconData icon, Color color, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(left: 10),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: CircleAvatar(radius: 18, backgroundColor: color, child: Icon(icon, color: Colors.white, size: 18)),
        ),
      );

  List<Widget> _friendsTab() {
    if (_friends.isEmpty) {
      return [EmptyState(emoji: '👋', title: 'No friends yet', text: 'Find players by their username and send a request.', actionLabel: 'Add Friends', onAction: () => setState(() => _tab = 'add'))];
    }
    return [
      for (final f in _friends)
        _row(
          f,
          IconButton(
            icon: const Icon(Icons.person_remove, color: AppColors.textMuted),
            onPressed: () async {
              if (await confirmDialog(context, 'Remove friend?', 'Remove ${f.displayName} from your friends?', yes: 'Remove')) {
                _run(() => FriendApi.remove(f.playerId), 'Friend removed');
              }
            },
          ),
        ),
    ];
  }

  List<Widget> _requestsTab() => [
        const SectionTitle('Received'),
        if (_received.isEmpty) const Text('No new requests', style: AppText.small),
        for (final r in _received)
          _row(
            r,
            Row(mainAxisSize: MainAxisSize.min, children: [
              _circleButton(Icons.close, AppColors.danger, () => _run(() => FriendApi.respond(r.friendshipId!, 'reject'), 'Request rejected')),
              _circleButton(Icons.check, AppColors.success, () => _run(() => FriendApi.respond(r.friendshipId!, 'accept'), 'You and ${r.displayName} are now friends!')),
            ]),
          ),
        const SectionTitle('Sent'),
        if (_sent.isEmpty) const Text('No pending requests', style: AppText.small),
        for (final s in _sent) _row(s, const Text('Pending', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700))),
      ];

  List<Widget> _addTab() {
    final friendIds = _friends.map((f) => f.playerId).toSet();
    final pendingIds = [..._sent, ..._received].map((f) => f.playerId).toSet();
    return [
      AppTextField(hint: 'Search by username', icon: Icons.search, controller: _query, onChanged: _search),
      for (final u in _results)
        _row(
          u,
          friendIds.contains(u.playerId)
              ? const Text('Friends', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700))
              : pendingIds.contains(u.playerId) || _requested.contains(u.username)
                  ? const Text('Requested', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700))
                  : SizedBox(
                      width: 90,
                      child: GradientButton(
                        title: 'Add',
                        icon: Icons.person_add,
                        size: ButtonSize.sm,
                        variant: ButtonVariant.gold,
                        onPressed: () => _run(() async {
                          await FriendApi.send(u.username);
                          setState(() => _requested.add(u.username));
                        }, 'Request sent to ${u.displayName}'),
                      ),
                    ),
        ),
      if (_query.text.trim().isNotEmpty && _results.isEmpty)
        const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: Text('No players found', style: AppText.small)),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (auth.isGuest) {
      return AppBackground(
        safeBottom: false,
        child: Column(children: [
          const AppHeader(title: 'Friends', back: false),
          EmptyState(
            emoji: '🫂',
            title: 'Friends need an account',
            text: 'Create a free account to add friends and invite them to rooms and tournaments.',
            actionLabel: 'Create Account',
            onAction: () => auth.logout(),
          ),
        ]),
      );
    }

    return AppBackground(
      safeBottom: false,
      child: Column(children: [
        const AppHeader(title: 'Friends', back: false),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: OptionPicker<String>(
            value: _tab,
            options: [
              Option('Friends (${_friends.length})', 'friends'),
              Option(_received.isEmpty ? 'Requests' : 'Requests (${_received.length})', 'requests'),
              const Option('Add', 'add'),
            ],
            onChanged: (t) => setState(() => _tab = t),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: AppColors.gold,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 30),
              children: _tab == 'friends' ? _friendsTab() : _tab == 'requests' ? _requestsTab() : _addTab(),
            ),
          ),
        ),
      ]),
    );
  }
}
