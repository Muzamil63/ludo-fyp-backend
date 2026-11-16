// SQL for rule_sets: the presets (Classic, Quick, Demo ...) and the custom rules players make for one game.
const { pool } = require('../config/db');

// Presets only: custom rows belong to one game or tournament, so they are not offered to everyone.
async function listAll(conn = pool) {
  const [rows] = await conn.query('SELECT * FROM rule_sets WHERE is_custom = 0 ORDER BY rule_set_id');
  return rows;
}

async function findById(ruleSetId, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM rule_sets WHERE rule_set_id = ?', [ruleSetId]);
  return rows[0] || null;
}

// Saves a player's own rules as a new row (is_custom = 1). r = checked values from utils/ruleInput.js.
async function createCustom(r, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO rule_sets
       (name, six_to_unlock, extra_turn_on_six, extra_turn_on_capture, extra_turn_on_home, capture_enabled,
        tokens_to_win, turn_seconds, tries_when_all_home, six_boost_after, is_custom)
     VALUES ('Custom', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [r.six_to_unlock, r.extra_turn_on_six, r.extra_turn_on_capture, r.extra_turn_on_home, r.capture_enabled,
      r.tokens_to_win, r.turn_seconds, r.tries_when_all_home, r.six_boost_after]
  );
  return result.insertId;
}

// Turns the choice from utils/ruleInput.readRuleChoice() into a rule_set_id: custom rules get their own new
// row, a preset must exist (and not be someone's custom row). Null = unknown preset (the controller sends 404).
async function resolveChoice(choice, conn = pool) {
  if (choice.custom) return createCustom(choice.custom, conn);
  const preset = await findById(choice.rule_set_id, conn);
  return preset && !preset.is_custom ? preset.rule_set_id : null;
}

module.exports = { listAll, findById, createCustom, resolveChoice };
