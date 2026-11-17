// Unit tests for the knockout bracket maths in src/game/bracket.js. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const bracket = require('../src/game/bracket');

const sizes = (n, per) => bracket.splitIntoGroups([...Array(n).keys()], per).map((g) => g.length);
const matchesPerRound = (n, per) => bracket.bracketShape(n, per).map((round) => round.length);

test('groups: 1v1 pairs players, odd one out makes a 3-player match (no byes)', () => {
  assert.deepEqual(sizes(8, 2), [2, 2, 2, 2]);
  assert.deepEqual(sizes(2, 2), [2]);
  assert.deepEqual(sizes(5, 2), [3, 2]);
  assert.deepEqual(sizes(3, 2), [3]);
});

test('groups: 4-player matches use as few matches as possible, never 1 player alone', () => {
  assert.deepEqual(sizes(16, 4), [4, 4, 4, 4]);
  assert.deepEqual(sizes(5, 4), [3, 2]);
  assert.deepEqual(sizes(2, 4), [2]);
});

test('groups: neighbours stay together and every player is in exactly one group', () => {
  assert.deepEqual(bracket.splitIntoGroups(['a', 'b', 'c', 'd', 'e', 'f'], 2), [['a', 'b'], ['c', 'd'], ['e', 'f']]);
  assert.deepEqual(bracket.splitIntoGroups([1, 2, 3, 4, 5, 6, 7], 4).flat(), [1, 2, 3, 4, 5, 6, 7]);
});

test('shape: 64 players 1v1 = 6 rounds (32, 16, 8, 4, 2, 1 matches)', () => {
  assert.deepEqual(matchesPerRound(64, 2), [32, 16, 8, 4, 2, 1]);
  assert.deepEqual(matchesPerRound(2, 2), [1]);
  assert.deepEqual(matchesPerRound(8, 2), [4, 2, 1]);
});

test('shape: 64 players in 4-player matches = 3 rounds (16, 4, 1 matches)', () => {
  assert.deepEqual(matchesPerRound(64, 4), [16, 4, 1]);
  assert.deepEqual(matchesPerRound(4, 4), [1]);
});

test('shape: odd numbers still end with one champion (10 players 1v1)', () => {
  assert.deepEqual(bracket.bracketShape(10, 2), [[2, 2, 2, 2, 2], [3, 2], [2]]);
  for (let n = 2; n <= 64; n++) {
    for (const per of [2, 4]) {
      const shape = bracket.bracketShape(n, per);
      assert.equal(shape[shape.length - 1].length, 1, `${n} players / ${per}: last round is one final`);
      assert.equal(shape[0].reduce((a, b) => a + b, 0), n, `${n} players / ${per}: round 1 seats everyone`);
    }
  }
});

test('view: future matches are "upcoming" and list the matches that feed them', () => {
  const shape = bracket.bracketShape(8, 2); // 4, 2, 1 matches
  const created = [{ match_id: 11, round_no: 1, match_no: 1, status: 'finished', seats: [{}, {}], winner_id: 5 }];
  const view = bracket.buildBracketView(shape, created);
  assert.equal(view.length, 3);
  assert.equal(view[0].matches[0].match_id, 11);           // created match is used as it is
  assert.equal(view[0].matches[1].status, 'upcoming');
  assert.deepEqual(view[1].matches[0].feeders, [1, 2]);    // round 2 match 1 = winners of R1 M1 + M2
  assert.deepEqual(view[1].matches[1].feeders, [3, 4]);
  assert.deepEqual(view[2].matches[0].feeders, [1, 2]);    // final = winners of the two semi-finals
});

test('preview: joined players fill round 1 in join order, the rest stays open', () => {
  const players = [{ player_id: 1, display_name: 'Ali' }, { player_id: 2, display_name: 'Sara' }, { player_id: 3, display_name: 'Zain' }];
  const seats = bracket.previewSeats([2, 2, 2, 2], players); // an 8-player 1v1 tournament
  assert.deepEqual(seats.map((s) => s.map((x) => x.display_name)), [['Ali', 'Sara'], ['Zain'], [], []]);
  assert.deepEqual(seats[0].map((x) => x.color), ['red', 'yellow']); // 2-player matches use seats 1 + 3
});

test('schedule: every round has a fixed time, roundMinutes apart', () => {
  const times = bracket.roundTimes('2026-12-01T18:00:00Z', 10, 3);
  assert.deepEqual(times.map((t) => t.toISOString()), ['2026-12-01T18:00:00.000Z', '2026-12-01T18:10:00.000Z', '2026-12-01T18:20:00.000Z']);
  const view = bracket.buildBracketView(bracket.bracketShape(8, 2), [], { times });
  assert.equal(view[2].matches[0].scheduled_at.toISOString(), '2026-12-01T18:20:00.000Z'); // the final
});
