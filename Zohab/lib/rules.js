// Short texts that describe a rule set ("6 to start · 4 home · 30s turns · no capture") and the Classic
// values custom rules start from. Same as the mobile app's utils/ruleText.ts.

export const CLASSIC_ID = 1 // the Classic row in rule_sets (every new game starts on it)

export const CLASSIC_RULES = {
  six_to_unlock: 1,
  extra_turn_on_six: 1,
  extra_turn_on_capture: 1,
  extra_turn_on_home: 1,
  capture_enabled: 1,
  tokens_to_win: 4,
  turn_seconds: 30,
  tries_when_all_home: 4, // while all tokens are in base, a 6 is guaranteed by the 4th try (0 = no guarantee)
  six_boost_after: 6,
}

// Only the rule fields (a rule_sets row also has an id, a name, ...). These are what "custom_rules" sends.
export function rulesOf(r) {
  return {
    six_to_unlock: r.six_to_unlock,
    extra_turn_on_six: r.extra_turn_on_six,
    extra_turn_on_capture: r.extra_turn_on_capture,
    extra_turn_on_home: r.extra_turn_on_home,
    capture_enabled: r.capture_enabled,
    tokens_to_win: r.tokens_to_win,
    turn_seconds: r.turn_seconds,
    tries_when_all_home: r.tries_when_all_home ?? 4,
    six_boost_after: r.six_boost_after ?? 6,
  }
}

// True when two rule sets have exactly the same rules.
export const sameRules = (a, b) => Object.keys(CLASSIC_RULES).every((k) => a[k] === b[k])

// One line with the main rules, plus every rule that differs from the usual game,
// e.g. "1 or 6 to start · 2 home · 20s turns · no capture".
export function ruleSummary(r) {
  const parts = [r.six_to_unlock ? '6 to start' : '1 or 6 to start', `${r.tokens_to_win} home`, `${r.turn_seconds}s turns`]
  if (!r.capture_enabled) parts.push('no capture')
  const noExtra = [!r.extra_turn_on_six && '6', !r.extra_turn_on_capture && 'capture', !r.extra_turn_on_home && 'home'].filter(Boolean)
  if (noExtra.length) parts.push(`no extra turn on ${noExtra.join('/')}`)
  // "6 by try N": while all tokens are in base, a 6 comes by the N-th try at the latest (4 is the usual game)
  const sixBy = r.tries_when_all_home ?? 4
  if (sixBy === 0) parts.push('no 6 guarantee')
  else if (sixBy !== 4) parts.push(`6 by try ${sixBy}`)
  if (!r.six_boost_after) parts.push('fair dice')
  return parts.join(' · ')
}
