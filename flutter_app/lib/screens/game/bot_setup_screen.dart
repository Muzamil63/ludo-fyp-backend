// "vs Computer" setup: number of players, mode, bot difficulty and rule set, then start.
import 'package:flutter/material.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import 'game_screen.dart';

class BotSetupScreen extends StatefulWidget {
  const BotSetupScreen({super.key});
  @override
  State<BotSetupScreen> createState() => _BotSetupScreenState();
}

class _BotSetupScreenState extends State<BotSetupScreen> {
  List<RuleSet> _ruleSets = [];
  int _ruleSetId = 1;
  int _players = 4;
  String _mode = 'ffa';
  String _difficulty = 'easy';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    MatchApi.ruleSets().then((r) => setState(() => _ruleSets = r)).catchError((err) => showError(err));
  }

  Future<void> _start() async {
    setState(() => _loading = true);
    try {
      final matchId = await MatchApi.createBot(ruleSetId: _ruleSetId, totalPlayers: _players, gameMode: _mode, difficulty: _difficulty);
      if (mounted) Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => GameScreen(matchId: matchId)));
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
          const AppHeader(title: 'vs Computer', subtitle: 'You are red. Bots take the other seats.'),
          Expanded(
            child: ListView(padding: const EdgeInsets.all(20), children: [
              GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  OptionPicker<int>(
                    label: 'Players',
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
                  OptionPicker<String>(
                    label: 'Bot difficulty',
                    value: _difficulty,
                    options: const [Option('😊 Easy', 'easy'), Option('😈 Hard', 'hard')],
                    onChanged: (d) => setState(() => _difficulty = d),
                  ),
                  if (_ruleSets.isNotEmpty)
                    OptionPicker<int>(
                      label: 'Rules',
                      value: _ruleSetId,
                      options: [for (final r in _ruleSets) Option(r.name, r.ruleSetId, hint: r.hint)],
                      onChanged: (id) => setState(() => _ruleSetId = id),
                    ),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text('Tip: "Demo" rules finish fast — only 1 token needs to reach home.', style: AppText.small),
                  ),
                  GradientButton(title: 'Start Game', icon: Icons.play_arrow, variant: ButtonVariant.gold, loading: _loading, onPressed: _start),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
