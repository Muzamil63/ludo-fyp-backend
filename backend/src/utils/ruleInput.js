// Reads the rules for a new game from the request body: a preset ({ rule_set_id }) or the player's own
// rules ({ custom_rules: {...} }). Every custom value is checked here, so bad input never reaches the DB.
const httpError = require('./httpError');
const { toId } = require('./validate');

// Allowed range of each custom rule, and its Classic value (used when the field is missing).
const CUSTOM_RULE_LIMITS = {
  six_to_unlock: { min: 0, max: 1, classic: 1 },         // 1 = only a 6 unlocks, 0 = a 1 or a 6
  extra_turn_on_six: { min: 0, max: 1, classic: 1 },
  extra_turn_on_capture: { min: 0, max: 1, classic: 1 },
  extra_turn_on_home: { min: 0, max: 1, classic: 1 },
  capture_enabled: { min: 0, max: 1, classic: 1 },
  tokens_to_win: { min: 1, max: 4, classic: 4 },
  turn_seconds: { min: 10, max: 60, classic: 30 },
  tries_when_all_home: { min: 0, max: 6, classic: 4 },  // a 6 by this try while stuck in base (0 = off)
  six_boost_after: { min: 0, max: 10, classic: 6 },      // 0 = always a fair dice
};

// Returns { rule_set_id } for a preset, or { custom: { ...all rule fields } } for custom rules.
function readRuleChoice(body, defaultRuleSetId = 1) {
  const input = body.custom_rules;
  if (input === undefined || input === null) {
    return { rule_set_id: toId(body.rule_set_id ?? defaultRuleSetId, 'rule_set_id') };
  }
  if (typeof input !== 'object' || Array.isArray(input)) throw httpError(400, 'custom_rules must be an object');

  const custom = {};
  for (const [field, { min, max, classic }] of Object.entries(CUSTOM_RULE_LIMITS)) {
    let value = input[field] ?? classic;
    if (typeof value === 'boolean') value = value ? 1 : 0; // the apps may send true / false for on / off
    value = Number(value);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw httpError(400, `custom_rules.${field} must be a whole number from ${min} to ${max}`);
    }
    custom[field] = value;
  }
  return { custom };
}

module.exports = { readRuleChoice, CUSTOM_RULE_LIMITS };
