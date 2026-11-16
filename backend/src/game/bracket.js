// Knockout bracket maths (pure: no DB, no sockets, unit tested in tests/bracket.test.js).
// The bracket is fixed when the tournament starts: round 1 is a random draw, and after that the winners
// of neighbouring matches meet (round 1 matches 1 + 2 → round 2 match 1, matches 3 + 4 → match 2, ...).

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

// The whole bracket for the apps, from round 1 to the final. Matches that already exist (rows with
// seats) are used as they are. The others are "upcoming": no players yet, and `feeders` lists the
// previous round's match numbers whose winners will play there.
function buildBracketView(shape, createdMatches) {
  return shape.map((sizes, r) => {
    const roundNo = r + 1;
    let firstFeeder = 1;
    const matches = sizes.map((size, i) => {
      const feeders = roundNo === 1 ? [] : Array.from({ length: size }, (_, k) => firstFeeder + k);
      firstFeeder += size;
      const created = createdMatches.find((m) => m.round_no === roundNo && m.match_no === i + 1);
      if (created) return { ...created, slots: size, feeders };
      return {
        match_id: null, round_no: roundNo, match_no: i + 1, status: 'upcoming', scheduled_at: null,
        seats: [], winner_id: null, slots: size, feeders,
      };
    });
    return { round_no: roundNo, matches };
  });
}

module.exports = { groupSizes, bracketShape, splitIntoGroups, buildBracketView };
