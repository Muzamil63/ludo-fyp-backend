-- Ludo FYP — fixed data: rule sets and bots.
-- Demo users and the demo tournament are added by reset.js (passwords must be hashed with bcrypt,
-- and a tournament needs a creator).

INSERT INTO rule_sets
  (name, six_to_unlock, extra_turn_on_six, extra_turn_on_capture, extra_turn_on_home, capture_enabled, tokens_to_win, turn_seconds, tries_when_all_home, six_boost_after)
VALUES
  ('Classic', 1, 1, 1, 1, 1, 4, 30, 3, 6),   -- id 1: standard Ludo (3 tries for a 6 while all tokens are in base)
  ('Quick',   0, 1, 1, 1, 1, 2, 20, 3, 6),   -- id 2: a 1 or 6 unlocks, 2 tokens home wins
  ('Demo',    0, 1, 1, 1, 1, 1, 10, 3, 6);   -- id 3: for viva demos (1 token home wins)

INSERT INTO bots (name, difficulty) VALUES
  ('Bot Ali', 'easy'), ('Bot Sara', 'easy'), ('Bot Zain', 'easy'),
  ('Bot Max', 'hard'), ('Bot Nova', 'hard'), ('Bot Rex',  'hard');
