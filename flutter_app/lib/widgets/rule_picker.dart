// Rules for a new game: Classic by default. "Customise" opens the Custom rules page, where any rule can change.
// Used by vs Computer, Create Room and the tournament form. The value is sent to the server as it is.
import 'package:flutter/material.dart';
import '../api/endpoints.dart';
import '../models.dart';
import '../screens/game/custom_rules_screen.dart';
import '../theme.dart';
import '../utils/rule_text.dart';

class RulePicker extends StatefulWidget {
  final RuleChoice value;
  final ValueChanged<RuleChoice> onChanged;
  const RulePicker({super.key, required this.value, required this.onChanged});
  @override
  State<RulePicker> createState() => _RulePickerState();
}

class _RulePickerState extends State<RulePicker> {
  static const _classicId = 1; // the Classic row in rule_sets
  List<RuleSet> _presets = [];

  @override
  void initState() {
    super.initState();
    MatchApi.ruleSets().then((r) {
      if (mounted) setState(() => _presets = r);
    }).catchError((_) {});
  }

  RuleSet? _presetById(int? id) => _presets.where((p) => p.ruleSetId == id).firstOrNull;
  // Classic's values come from the server (so a changed Classic row shows right), with a local fallback
  CustomRules get _classic => _presetById(_classicId)?.rules ?? {...classicRules};

  // Opens the Custom rules page with the current rules. Rules equal to Classic simply use the Classic preset.
  Future<void> _customise(CustomRules shown) async {
    final rules = await Navigator.push<CustomRules>(context, MaterialPageRoute(builder: (_) => CustomRulesScreen(initial: shown)));
    if (rules == null) return; // went back without saving
    widget.onChanged(sameRules(rules, _classic) ? const RuleChoice.preset(_classicId) : RuleChoice.custom(rules));
  }

  @override
  Widget build(BuildContext context) {
    final custom = widget.value.custom;
    final preset = _presetById(widget.value.ruleSetId);
    final shown = custom ?? preset?.rules ?? _classic;
    final title = custom != null ? '⚙️ Custom rules' : '📜 ${preset?.name ?? 'Classic'} rules';

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Padding(padding: EdgeInsets.only(bottom: 8), child: Text('RULES', style: AppText.label)),
        Material(
          color: custom != null ? AppColors.gold.withAlpha(26) : Colors.white.withAlpha(18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: custom != null ? AppColors.gold : Colors.white.withAlpha(31), width: 1.5),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _customise(shown),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(title,
                        style: TextStyle(color: custom != null ? AppColors.gold : AppColors.text, fontWeight: FontWeight.w900, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(ruleSummary(shown), style: const TextStyle(color: AppColors.textDim, fontSize: 12)),
                  ]),
                ),
                const Icon(Icons.tune, color: AppColors.gold, size: 18),
                const SizedBox(width: 4),
                Text(custom != null ? 'Edit' : 'Customise', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w800)),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
