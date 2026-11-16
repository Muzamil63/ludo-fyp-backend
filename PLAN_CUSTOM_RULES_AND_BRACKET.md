# Plan: Custom rules + full tournament bracket (up to 64 players)

Two changes asked for after the first review:

1. **Custom rules.** Before starting a game, the player can choose a preset (Classic, Quick, Demo) or set their own rules.
2. **Full bracket map.** When a tournament starts, everyone sees the whole knockout tree, from round 1 to the final. Tournaments can have up to **64 players**.

Order of work: **backend first** (with tests), then the **React Native** app, then the **Flutter** app (kept the same).

---

## 1. Decisions (and why)

| # | Decision | Why |
|---|----------|-----|
| D1 | A custom rule set is saved as a **new row in `rule_sets`** with `is_custom = 1`. It is created when the game (or tournament) is created. | Matches and tournaments already point to `rule_set_id`, and the game engine already reads every rule from that row. So the engine needs **no change**. The ERD keeps its 19 entities and 24 relationships, plus **one new attribute**. |
| D2 | Custom rules are available for **vs Computer, private rooms and tournaments**. **Online matchmaking stays on Classic.** | In matchmaking, strangers are put together at random, so everyone must play the same rules. Giving every rule set its own queue would split players apart. This is listed as future work. |
| D3 | `GET /rule-sets` still lists only the **presets**. Custom rows are hidden from that list. | Otherwise the preset list would fill up with one row per custom game. |
| D4 | The bracket becomes a **fixed tree** that is decided at the start. Round 1 is drawn at random. After that, **the winners of neighbouring matches meet** (winners of matches 1 and 2 → next round's match 1). | Today every round is re-drawn at random, so later rounds can't be shown in advance. A fixed tree can be drawn completely from the beginning. |
| D5 | The tree's shape is **calculated** from the player count by a pure function. Matches that don't exist yet are shown as *"Winner of R1 M1 vs Winner of R1 M2"*. **No new tables.** | It's the same data the DB already has (`tournament_matches.round_no / match_no`), plus a little maths. It's easy to explain and test. |
| D6 | Sizes: **2, 4, 8, 16, 32, 64**. Formats: 1 vs 1, or 4 players per match. The **no byes** rule stays: an odd player out joins a pair and makes a 3-player match. | This meets the 64-player requirement without changing the rest of the tournament flow. |
| D7 | During **registration**, the tree is a **preview** built from `max_participants`. When the tournament **starts**, it's rebuilt from the real number of players. | Players can see the bracket before the start, and the real tree is fixed when round 1 is drawn. |

---

## 2. Backend

### B1. Database (schema.sql + seed.sql + live DB with ALTER, no data lost)
- `rule_sets`: add `is_custom TINYINT(1) NOT NULL DEFAULT 0`. Drop the UNIQUE index on `name`, because every custom row is called "Custom" (presets stay unique through the seed).
- `constants.TOURNAMENT_SIZES` becomes `[2, 4, 8, 16, 32, 64]`. `max_participants` is TINYINT, so 64 fits.

### B2. Custom rules
- New `src/utils/ruleInput.js`. `readRuleChoice(body)` reads **either** `rule_set_id` (a preset) **or** `custom_rules: { ... }`, checks every field, and throws a 400 error for bad input:

  | Field | Allowed |
  |-------|---------|
  | six_to_unlock | 0 / 1 (1 = only a 6 unlocks) |
  | extra_turn_on_six / _capture / _home | 0 / 1 |
  | capture_enabled | 0 / 1 |
  | tokens_to_win | 1–4 |
  | turn_seconds | 10–60 |
  | tries_when_all_home | 1–5 |
  | six_boost_after | 0–10 (0 = always fair dice) |

  A missing field takes the Classic value.
- `ruleSetModel.createCustom(rules, conn)` inserts the row inside the same transaction as the match or tournament. `listAll()` returns presets only.
- Wired into `POST /matches/bot`, `POST /rooms`, `POST /tournaments` and `PUT /tournaments/:id`.
- Match, room and tournament responses already include the rule set row, so the apps can show "Custom" and its values.

### B3. Full bracket
- New pure file `src/game/bracket.js`, unit-tested:
  - `groupSizes(n, perMatch)`: match sizes for one round, using the same no-byes rule as today.
  - `bracketShape(n, perMatch)`: every round's match sizes until 1 player is left. For example, 64 players 1v1 → 32, 16, 8, 4, 2, 1 matches (6 rounds), and 64 players in 4-player matches → 16, 4, 1 (3 rounds).
  - `splitIntoGroups(players, perMatch)`: cuts the ordered list into neighbouring groups. This replaces `ludoEngine.makeTournamentGroups`.
  - `buildBracketView(shape, createdMatches)`: merges the shape with the matches that already exist. Matches not yet created get `status: 'upcoming'` and `feeders: [1, 2]`, the previous-round match numbers whose winners will play here.
- `tournamentManager.buildRound`:
  - **round 1:** shuffle the players, then split them.
  - **later rounds:** take the winners **in match order** of the previous round (new `tournamentModel.listRoundWinners`), then split them. This follows the tree.
- `GET /tournaments/:id` now returns:
  - `rounds`: **every** round from 1 to the final, with existing and upcoming matches.
  - `total_rounds`.
  - `preview` (true before the start).

### B4. Tests
- **Unit tests:** bracket shapes for 2–64 players in both formats, feeders, splitting; custom rule validation (good input, bad input, defaults).
- **End-to-end (live server):**
  - custom rules in a bot match and in a room, checking the match really uses them;
  - a **64-player 1v1 tournament** played to a champion, checking the bracket at the start (32/16/8/4/2/1 matches, upcoming slots) and that every winner moves to the correct next match;
  - 64 players in 4-player matches;
  - an odd player count (10 players);
  - the existing 61-check regression run.

### B5. Docs
- CLAUDE.md: API (`custom_rules`, the bracket in the tournament response), DB columns, sizes up to 64, new viva recipes.
- The Postman collection gets a custom-rules example.

---

## 3. Frontend: React Native first, then Flutter (kept the same)

### F1. `RulePicker` component (used on every "start a game" screen)
- No preset chips (changed after review): every game starts on **Classic**. The Rules section is one card, *"📜 Classic rules · 6 to start · 4 home · 30s turns"*, with a **Customise** button. After customising, the card turns gold, shows the custom rules and has an **Edit** button. Rules set back to Classic values just use Classic again.
- Choosing **Custom** opens a separate **"Custom rules" page** (`CustomRulesScreen`), starting from the selected preset. "Use these rules" returns to the form, which then shows a summary card with an Edit button. The page has:
  - Unlock with: *6 only* / *1 or 6*
  - Tokens to win: 1 2 3 4
  - Turn time: 10 20 30 60 s
  - Capture: on / off
  - Extra turn on 6 / capture / reaching home: on / off for each
  - Tries for the first 6: 1 / 3 / 5
  - Lucky-6 help (bad-luck protection): off / on
- A one-line summary shows under the chips, for example *"Custom · 6 only · 2 home · 20 s · no capture"*.

### F2. Where custom rules appear
- **vs Computer** setup, **Create Room** and the **Tournament form** (create and edit) all use `RulePicker`.
- The **Room lobby**, **Tournament detail** and **Game screen** header show the rules summary, so everyone knows what they're playing.

### F3. Tournament size
- The form offers 2 / 4 / 8 / 16 / **32 / 64** players, and shows "≈ N rounds".

### F4. Bracket map
- New `BracketTree` component:
  - columns of rounds, named **Round 1 … Quarter-finals · Semi-finals · Final**;
  - match cards placed at the centre of their two feeder matches, joined by **connector lines** (react-native-svg is already installed);
  - scrolls both sideways and up/down, and handles 64 players (32 cards in the first column);
  - each card shows players with their colour dot, the winner with a crown and losers struck through, the time or status, and *"Winner of R1 M3"* for slots not yet known;
  - your own matches are highlighted.
- Tournament detail gets a bracket card with a **"Open full bracket"** button, which opens a new full-screen **Bracket** screen. Before the start it's labelled *"Preview (when full)"*.

### F5. Flutter
- The same `RulePicker`, form changes and `BracketTree`, drawn with a CustomPainter inside an `InteractiveViewer` so it can also pinch-zoom.

### F6. Check on devices
- Type check, jest, flutter analyze and flutter test.
- Run on the phone and emulator: create a custom-rules bot game, create a 64-player tournament and look at the full preview tree.

---

## 4. Not in this change (possible future work)
- Custom rules in online matchmaking (a separate queue per rule set).
- Seeding by ranking instead of a random round-1 draw.
- Byes, and double-elimination brackets.
