// Knockout bracket maths (pure: no DB, no sockets, unit tested in tests/bracket.test.js).
// The bracket is fixed when the tournament starts: round 1 is a random draw, and after that the winners
// of neighbouring matches meet (round 1 matches 1 + 2 → round 2 match 1, matches 3 + 4 → match 2, ...).
// Every round also has a fixed start time (round 1, then one round every `round minutes`).
const C = require('./constants');

// Sizes of the matches in one round of n players. No byes: in 1v1 the odd player out joins a pair
// (a 3-player match); with 4-player matches the players are spread evenly (5 → 3 + 2).
function groupSizes(n, perMatch) {
  const count = Math.max(1, perMatch === 2 ? Math.floor(n / 2) : Math.ceil(n / perMatch));
  const base = Math.floor(n / count);
  const extra = n % count; // the first `extra` matches get one more player
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

// Every round of a tournament with n players: an array of rounds, each one an array of match sizes.
// 64 players 1v1 → 6 rounds of 32, 16, 8, 4, 2 and 1 matches. 64 players, 4 per match → 16, 4, 1.
function bracketShape(n, perMatch) {
  const rounds = [];
  let players = n;
  while (players > 1) {
    const sizes = groupSizes(players, perMatch);
    rounds.push(sizes);
    players = sizes.length; // one winner per match goes on
  }
  return rounds;
}

// Cuts an ordered list (players, or the previous round's winners) into neighbouring groups.
function splitIntoGroups(list, perMatch) {
  const groups = [];
  let next = 0;
  for (const size of groupSizes(list.length, perMatch)) {
    groups.push(list.slice(next, next + size));
    next += size;
  }
  return groups;
}

// Live preview before the start: the players who joined so far, in join order, sit in round 1's places
// (not final: the real random draw happens at the start). Returns the seats of each round-1 match.
function previewSeats(roundOneSizes, players) {
  let next = 0;
  return roundOneSizes.map((size) => {
    const seatNos = C.SEATS_FOR_PLAYERS[size]; // same seats / colours a real match of this size gets
    const seats = [];
    for (let k = 0; k < size && next < players.length; k++, next++) {
      const p = players[next];
      seats.push({ seat_no: seatNos[k], color: C.SEAT_COLORS[seatNos[k]], player_id: p.player_id, bot_id: null, display_name: p.display_name, finish_position: null });
    }
    return seats;
  });
}

// Fixed schedule: round 1 at `firstRoundAt`, then each round `roundMinutes` after the one before.
function roundTimes(firstRoundAt, roundMinutes, roundCount) {
  const first = new Date(firstRoundAt).getTime();
  return Array.from({ length: roundCount }, (_, r) => new Date(first + r * roundMinutes * 60000));
}

// The whole bracket for the apps, from round 1 to the final. Matches that already exist (rows with
// seats) are used as they are. The others are "upcoming": their planned time, and `feeders` lists the
// previous round's match numbers whose winners will play there. Before the start, round 1 shows the
// players who joined so far (previewPlayers).
function buildBracketView(shape, createdMatches, { times = [], previewPlayers = null } = {}) {
  const preview = previewPlayers ? previewSeats(shape[0] || [], previewPlayers) : null;
  return shape.map((sizes, r) => {
    const roundNo = r + 1;
    let firstFeeder = 1;
    const matches = sizes.map((size, i) => {
      const feeders = roundNo === 1 ? [] : Array.from({ length: size }, (_, k) => firstFeeder + k);
      firstFeeder += size;
      const created = createdMatches.find((m) => m.round_no === roundNo && m.match_no === i + 1);
      if (created) return { ...created, slots: size, feeders };
      return {
        match_id: null, round_no: roundNo, match_no: i + 1, status: 'upcoming', scheduled_at: times[r] || null,
        seats: roundNo === 1 && preview ? preview[i] : [], winner_id: null, slots: size, feeders,
      };
    });
    return { round_no: roundNo, matches };
  });
}

module.exports = { groupSizes, bracketShape, splitIntoGroups, previewSeats, roundTimes, buildBracketView };
