// Bottom sheet listing my friends with an "Invite" button each (used by rooms and tournaments).
import 'package:flutter/material.dart';
import '../api/endpoints.dart';
import '../models.dart';
import '../state/notifications.dart';
import '../theme.dart';
import 'common.dart';
import 'gradient_button.dart';

/// Opens the sheet. onInvite sends the invitation for one friend (room or tournament).
Future<void> showInviteFriendsSheet(BuildContext context, {required Future<void> Function(int friendId) onInvite, List<int> excludeIds = const []}) {
  return showAppSheet(context, title: 'Invite friends', builder: (_) => _InviteList(onInvite: onInvite, excludeIds: excludeIds));
}

class _InviteList extends StatefulWidget {
  final Future<void> Function(int friendId) onInvite;
  final List<int> excludeIds;
  const _InviteList({required this.onInvite, required this.excludeIds});

  @override
  State<_InviteList> createState() => _InviteListState();
}

class _InviteListState extends State<_InviteList> {
  List<Person>? _friends;
  final Set<int> _invited = {};
  int? _busy;

  @override
  void initState() {
    super.initState();
    FriendApi.list().then((f) => setState(() => _friends = f)).catchError((_) => setState(() => _friends = []));
  }

  Future<void> _invite(int id) async {
    setState(() => _busy = id);
    try {
      await widget.onInvite(id);
      setState(() => _invited.add(id));
    } catch (err) {
      showError(err);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_friends == null) return const Padding(padding: EdgeInsets.all(30), child: LoadingView());
    final list = _friends!.where((f) => !widget.excludeIds.contains(f.playerId)).toList();
    if (list.isEmpty) {
      return const EmptyState(emoji: '🫂', title: 'No friends to invite', text: 'Add friends in the Friends tab, then invite them here.');
    }
    return Column(children: [
      for (final f in list)
        Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withAlpha(20)))),
          child: Row(children: [
            AvatarCircle(avatar: f.avatar, name: f.displayName, size: 38),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(f.displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                Text('@${f.username}', style: AppText.small),
              ]),
            ),
            SizedBox(
              width: 110,
              child: GradientButton(
                title: _invited.contains(f.playerId) ? 'Invited ✓' : 'Invite',
                size: ButtonSize.sm,
                variant: _invited.contains(f.playerId) ? ButtonVariant.success : ButtonVariant.gold,
                loading: _busy == f.playerId,
                onPressed: _invited.contains(f.playerId) ? null : () => _invite(f.playerId),
              ),
            ),
          ]),
        ),
    ]);
  }
}
