// Host a private room: choose seats, mode and rules; you get a 6-letter code to share.
import 'package:flutter/material.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/notifications.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import 'room_lobby_screen.dart';

class CreateRoomScreen extends StatefulWidget {
  const CreateRoomScreen({super.key});
  @override
  State<CreateRoomScreen> createState() => _CreateRoomScreenState();
}

class _CreateRoomScreenState extends State<CreateRoomScreen> {
  List<RuleSet> _ruleSets = [];
  int _ruleSetId = 1;
  int _players = 4;
  String _mode = 'ffa';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    MatchApi.ruleSets().then((r) => setState(() => _ruleSets = r)).catchError((_) {});
  }

  Future<void> _create() async {
    setState(() => _loading = true);
    try {
      final room = await RoomApi.create(ruleSetId: _ruleSetId, maxPlayers: _players, gameMode: _mode);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(
        builder: (_) => RoomLobbyScreen(matchId: room['match_id'] as int, roomCode: room['room_code'] as String),
      ));
    } catch (err) {
      showError(err);
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          const AppHeader(title: 'Create Room', subtitle: 'Invite friends or share the code'),
          Expanded(
            child: ListView(padding: const EdgeInsets.all(20), children: [
              GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  OptionPicker<int>(
                    label: 'Seats',
                    value: _players,
                    options: const [Option('2', 2), Option('3', 3), Option('4', 4)],
                    onChanged: (p) => setState(() {
                      _players = p;
                      if (p != 4) _mode = 'ffa';
                    }),
                  ),
                  OptionPicker<String>(
                    label: 'Mode',
                    value: _mode,
                    options: [const Option('Free for all', 'ffa'), Option('2 vs 2', '2v2', disabled: _players != 4, hint: _players != 4 ? 'needs 4' : null)],
                    onChanged: (m) => setState(() => _mode = m),
                  ),
                  if (_ruleSets.isNotEmpty)
                    OptionPicker<int>(
                      label: 'Rules',
                      value: _ruleSetId,
                      options: [for (final r in _ruleSets) Option(r.name, r.ruleSetId, hint: r.hint)],
                      onChanged: (id) => setState(() => _ruleSetId = id),
                    ),
                  GradientButton(title: 'Create Room', icon: Icons.meeting_room, variant: ButtonVariant.gold, loading: _loading, onPressed: _create),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
