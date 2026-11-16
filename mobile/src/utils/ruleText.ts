// Short texts that describe a rule set ("6 to start · 2 home · 20s turns · no capture") and the Classic values
// a custom rule set starts from.
import type { CustomRules } from '../types';

export const CLASSIC_RULES: CustomRules = {
  six_to_unlock: 1,
  extra_turn_on_six: 1,
  extra_turn_on_capture: 1,
  extra_turn_on_home: 1,
  capture_enabled: 1,
  tokens_to_win: 4,
  turn_seconds: 30,
  tries_when_all_home: 3,
  six_boost_after: 6,
};

// Only the rule fields (a rule_sets row also has an id, a name, ...).
export function rulesOf(r: CustomRules): CustomRules {
  return {
    six_to_unlock: r.six_to_unlock,
    extra_turn_on_six: r.extra_turn_on_six,
    extra_turn_on_capture: r.extra_turn_on_capture,
    extra_turn_on_home: r.extra_turn_on_home,
    capture_enabled: r.capture_enabled,
    tokens_to_win: r.tokens_to_win,
    turn_seconds: r.turn_seconds,
    tries_when_all_home: r.tries_when_all_home ?? 3,
    six_boost_after: r.six_boost_after ?? 6,
  };
}

// True when two rule sets have exactly the same rules.
export const sameRules = (a: CustomRules, b: CustomRules) =>
  (Object.keys(CLASSIC_RULES) as (keyof CustomRules)[]).every((k) => a[k] === b[k]);

// One line with every rule that differs from the usual game, e.g. "1 or 6 · 2 home · 20s · no capture".
export function ruleSummary(r: CustomRules): string {
  const parts = [r.six_to_unlock ? '6 to start' : '1 or 6 to start', `${r.tokens_to_win} home`, `${r.turn_seconds}s turns`];
  if (!r.capture_enabled) parts.push('no capture');
  const noExtra = [!r.extra_turn_on_six && '6', !r.extra_turn_on_capture && 'capture', !r.extra_turn_on_home && 'home'].filter(Boolean);
  if (noExtra.length) parts.push(`no extra turn on ${noExtra.join('/')}`);
  if ((r.tries_when_all_home ?? 3) !== 3) parts.push(`${r.tries_when_all_home} tries at home`);
  if (!r.six_boost_after) parts.push('fair dice');
  return parts.join(' · ');
}
