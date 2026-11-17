// "Custom rules" page: the player sets every rule for one game (or tournament), then taps "Use these rules".
// Opened from the Rules picker; it returns the rules with Navigator.pop (null when the player goes back).
import 'package:flutter/material.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../utils/rule_text.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';

class CustomRulesScreen extends StatefulWidget {
  final CustomRules initial;
  const CustomRulesScreen({super.key, required this.initial});
  @override
  State<CustomRulesScreen> createState() => _CustomRulesScreenState();
}

class _CustomRulesScreenState extends State<CustomRulesScreen> {
  static const _onOff = [Option('On', 1), Option('Off', 0)];
  late CustomRules _rules = {...widget.initial};

  void _set(String field, int value) => setState(() => _rules = {..._rules, field: value});

  // One rule = one row of chips
  Widget _rule(String label, String field, List<Option<int>> options) =>
      OptionPicker<int>(label: label, value: _rules[field]!, options: options, onChanged: (v) => _set(field, v));

  Widget _section(String title, List<Widget> rules) => GlassCard(
        margin: const EdgeInsets.only(bottom: 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Text(title, style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 16)),
          ),
          ...rules,
        ]),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          const AppHeader(title: 'Custom rules', subtitle: 'Set every rule for this game'),
          Expanded(
            child: ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 40), children: [
              _section('Start & finish', [
                _rule('A token leaves the base on', 'six_to_unlock', const [Option('A 6 only', 1), Option('A 1 or a 6', 0)]),
                _rule('Tokens home to win', 'tokens_to_win', [for (final n in [1, 2, 3, 4]) Option('$n', n)]),
                _rule('Time per turn', 'turn_seconds', [for (final s in [10, 20, 30, 60]) Option('${s}s', s)]),
              ]),
              _section('Captures & extra turns', [
                _rule('Capturing', 'capture_enabled', _onOff),
                _rule('Extra turn on a 6', 'extra_turn_on_six', _onOff),
                _rule('Extra turn after a capture', 'extra_turn_on_capture', _onOff),
                _rule('Extra turn when a token gets home', 'extra_turn_on_home', _onOff),
              ]),
              _section('Dice help', [
                _rule('A 6 is guaranteed by try (while all tokens are in base)', 'tries_when_all_home', [for (final n in [3, 4, 5]) Option('$n', n), const Option('Off', 0)]),
                // On = the server's bad-luck protection after 6 rolls without a 6; Off = completely fair dice
                OptionPicker<int>(
                  label: 'Lucky-6 help (no very long waits for a 6)',
                  value: _rules['six_boost_after'] == 0 ? 0 : 1,
                  options: _onOff,
                  onChanged: (v) => _set('six_boost_after', v == 1 ? 6 : 0),
                ),
              ]),
              const Center(child: Text('YOUR RULES', style: AppText.label)),
              Padding(
                padding: const EdgeInsets.fromLTRB(0, 6, 0, 18),
                child: Text(ruleSummary(_rules), textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w800, fontSize: 14)),
              ),
              GradientButton(title: 'Use these rules', icon: Icons.check, variant: ButtonVariant.gold, onPressed: () => Navigator.pop(context, _rules)),
              const SizedBox(height: 12),
              GradientButton(
                title: 'Reset to Classic',
                icon: Icons.restart_alt,
                variant: ButtonVariant.ghost,
                size: ButtonSize.md,
                onPressed: () => setState(() => _rules = {...classicRules}),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
