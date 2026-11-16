// "vs Computer" setup: number of players, mode, bot difficulty and rules (a preset or custom), then start.
import 'package:flutter/material.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/rule_picker.dart';
import 'game_screen.dart';

class BotSetupScreen extends StatefulWidget {
  const BotSetupScreen({super.key});
  @override
  State<BotSetupScreen> createState() => _BotSetupScreenState();
}

class _BotSetupScreenState extends State<BotSetupScreen> {
  RuleChoice _rules = const RuleChoice.preset(1); // Classic
  int _players = 4;
  String _mode = 'ffa';
  String _difficulty = 'easy';
  bool _loading = false;

  Future<void> _start() async {
    setState(() => _loading = true);
    try {
      final matchId = await MatchApi.createBot(rules: _rules, totalPlayers: _players, gameMode: _mode, difficulty: _difficulty);
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
                  RulePicker(value: _rules, onChanged: (r) => setState(() => _rules = r)),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text('Tip: for a quick game, tap Customise and set "Tokens home to win" to 1.', style: AppText.small),
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
