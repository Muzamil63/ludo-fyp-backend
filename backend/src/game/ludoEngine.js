// Pure Ludo rules: valid moves, capture, extra turn, next seat, finish and ranking.
// No database and no sockets here, so every function can be unit tested (tests/ludoEngine.test.js).
// A token is { token_id, seat_no, color, team_no, position }. "rules" is a row from rule_sets.
const C = require('./constants');

// The dice, with bad-luck protection. Normally a fair dice (each number 1 in 6). But after
// rules.six_boost_after rolls in a row without a 6, a 6 is 1 in 3 until the player rolls one, so nobody waits
// very long for a 6 (same rule for every player; 0 = always fair). randomInt is crypto.randomInt, passed in
// so this function stays pure and testable.
function rollDiceValue(rollsSinceSix, rules, randomInt) {
  const boosted = rules.six_boost_after > 0 && rollsSinceSix >= rules.six_boost_after;
  if (!boosted) return randomInt(1, 7); // 1..6
  return randomInt(0, 3) === 0 ? 6 : randomInt(1, 6); // 6 = 1 in 3, the other 2 in 3 are 1..5
}

// Dice values that let a token leave the base.
function unlockValues(rules) {
  return rules.six_to_unlock ? [6] : [1, 6];
}

// All moves the seat can make with this dice value: [{ token_id, from, to }]
function getValidMoves(seatTokens, dice, rules) {
  const moves = [];
  for (const t of seatTokens) {
    if (t.position === C.BASE_POS) {
      if (unlockValues(rules).includes(dice)) moves.push({ token_id: t.token_id, from: C.BASE_POS, to: 0 });
    } else if (t.position + dice <= C.HOME_POS) {
      // Exact roll needed to reach home, so moves past 56 are not allowed.
      moves.push({ token_id: t.token_id, from: t.position, to: t.position + dice });
    }
  }
  return moves;
}

// "3 tries at home" (a traditional rule): while none of the seat's tokens is on the board (all in base,
// or already home), a roll that cannot move gives another try, up to rules.tries_when_all_home rolls a turn.
// triesUsed = missed rolls already made this turn. Returns how many tries are left after this miss.
function triesLeftAfterMiss(seatTokens, triesUsed, rules) {
  const noneOnBoard = seatTokens.every((t) => t.position === C.BASE_POS || t.position === C.HOME_POS);
  if (!noneOnBoard) return 0;
  return Math.max(0, (rules.tries_when_all_home || 1) - (triesUsed + 1));
}

// Turns a colour-relative position into a shared track cell (0-51). Null for base / home column / home.
function toGlobalCell(color, position) {
  if (position < 0 || position > C.LAST_TRACK_POS) return null;
  return (C.START_OFFSET[color] + position) % C.TRACK_LENGTH;
}

function isSafeCell(globalCell) {
  return C.SAFE_CELLS.includes(globalCell);
}

// Returns the opponent token captured by this move, or null.
// Capture only if exactly ONE opponent token is on a normal (not safe) track cell.
// Two or more tokens on one cell form a safe group. Teammates are never captured.
function findCapture(move, mover, allTokens) {
  const cell = toGlobalCell(mover.color, move.to);
  if (cell === null || isSafeCell(cell)) return null;

  const opponents = allTokens.filter(
    (t) =>
      t.seat_no !== mover.seat_no &&
      !(mover.team_no && t.team_no === mover.team_no) &&
      toGlobalCell(t.color, t.position) === cell
  );
  return opponents.length === 1 ? opponents[0] : null;
}

function isSeatFinished(seatTokens, rules) {
  const home = seatTokens.filter((t) => t.position === C.HOME_POS).length;
  return home >= rules.tokens_to_win;
}

function getsExtraTurn({ dice, captured, reachedHome }, rules) {
  return (
    (dice === 6 && !!rules.extra_turn_on_six) ||
    (!!captured && !!rules.extra_turn_on_capture) ||
    (!!reachedHome && !!rules.extra_turn_on_home)
  );
}

// Next seat clockwise among the seats still playing (wraps around to the lowest seat).
function getNextSeat(currentSeat, activeSeatNos) {
  const sorted = [...activeSeatNos].sort((a, b) => a - b);
  const next = sorted.find((s) => s > currentSeat);
  return next !== undefined ? next : sorted[0];
}

// How far a seat got: base counts 0, start cell 1, ..., home 57 for each token.
function progressScore(seatTokens) {
  return seatTokens.reduce((sum, t) => sum + t.position + 1, 0);
}

// Final positions. FFA: winner = 1, others by progress (ties: lower seat first). 2v2: winners 1, losers 2.
function rankSeats(seats, tokens, winnerSeatNos, gameMode) {
  if (gameMode === '2v2') {
    return seats.map((s) => ({ seat_no: s.seat_no, finish_position: winnerSeatNos.includes(s.seat_no) ? 1 : 2 }));
  }
  const others = seats
    .filter((s) => !winnerSeatNos.includes(s.seat_no))
    .map((s) => ({ seat_no: s.seat_no, score: progressScore(tokens.filter((t) => t.seat_no === s.seat_no)) }))
    .sort((a, b) => b.score - a.score || a.seat_no - b.seat_no);

  return [
    ...winnerSeatNos.map((seat_no) => ({ seat_no, finish_position: 1 })),
    ...others.map((o, i) => ({ seat_no: o.seat_no, finish_position: i + 2 })),
  ];
}

module.exports = {
  rollDiceValue,
  unlockValues,
  getValidMoves,
  triesLeftAfterMiss,
  toGlobalCell,
  isSafeCell,
  findCapture,
  isSeatFinished,
  getsExtraTurn,
  getNextSeat,
  progressScore,
  rankSeats,
};
