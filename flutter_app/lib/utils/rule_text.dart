// Short texts that describe a rule set ("1 or 6 to start · 2 home · 20s turns · no capture") and the Classic
// values a custom rule set starts from.
import '../models.dart';

const CustomRules classicRules = {
  'six_to_unlock': 1,
  'extra_turn_on_six': 1,
  'extra_turn_on_capture': 1,
  'extra_turn_on_home': 1,
  'capture_enabled': 1,
  'tokens_to_win': 4,
  'turn_seconds': 30,
  'tries_when_all_home': 3,
  'six_boost_after': 6,
};

/// True when two rule sets have exactly the same rules.
bool sameRules(CustomRules a, CustomRules b) => classicRules.keys.every((k) => a[k] == b[k]);

/// One line with the main rules plus every rule that differs from the usual game,
/// e.g. "1 or 6 to start · 2 home · 20s turns · no capture".
String ruleSummary(CustomRules r) {
  final parts = [
    r['six_to_unlock'] == 1 ? '6 to start' : '1 or 6 to start',
    '${r['tokens_to_win']} home',
    '${r['turn_seconds']}s turns',
  ];
  if (r['capture_enabled'] == 0) parts.add('no capture');
  final noExtra = [
    if (r['extra_turn_on_six'] == 0) '6',
    if (r['extra_turn_on_capture'] == 0) 'capture',
    if (r['extra_turn_on_home'] == 0) 'home',
  ];
  if (noExtra.isNotEmpty) parts.add('no extra turn on ${noExtra.join('/')}');
  if ((r['tries_when_all_home'] ?? 3) != 3) parts.add('${r['tries_when_all_home']} tries at home');
  if (r['six_boost_after'] == 0) parts.add('fair dice');
  return parts.join(' · ');
}
