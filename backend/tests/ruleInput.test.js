// Unit tests for reading custom rules from a request (src/utils/ruleInput.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { readRuleChoice } = require('../src/utils/ruleInput');

test('custom rules: no custom_rules → the preset id (default Classic = 1)', () => {
  assert.deepEqual(readRuleChoice({}), { rule_set_id: 1 });
  assert.deepEqual(readRuleChoice({ rule_set_id: 3 }), { rule_set_id: 3 });
});

test('custom rules: missing fields take the Classic value, true/false become 1/0', () => {
  const { custom } = readRuleChoice({ custom_rules: { tokens_to_win: 2, capture_enabled: false, turn_seconds: 15 } });
  assert.equal(custom.tokens_to_win, 2);
  assert.equal(custom.capture_enabled, 0);
  assert.equal(custom.turn_seconds, 15);
  assert.equal(custom.six_to_unlock, 1);        // Classic
  assert.equal(custom.tries_when_all_home, 4);  // Classic
});

test('custom rules: values out of range are refused with 400', () => {
  for (const bad of [{ tokens_to_win: 5 }, { turn_seconds: 5 }, { turn_seconds: 'abc' }, { tries_when_all_home: 7 }, { six_boost_after: 11 }]) {
    assert.throws(() => readRuleChoice({ custom_rules: bad }), (err) => err.status === 400, JSON.stringify(bad));
  }
  assert.throws(() => readRuleChoice({ custom_rules: 'nope' }), (err) => err.status === 400);
});
