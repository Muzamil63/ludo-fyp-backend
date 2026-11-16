// Shapes of the data the backend sends (snake_case, same as the API).
import type { LudoColor } from './theme';

export type PlayerType = 'guest' | 'registered';

export interface Player {
  player_id: number;
  display_name: string;
  avatar: string | null;
  player_type: PlayerType;
  username?: string | null;
  email?: string | null;
  games_played?: number | null;
  games_won?: number | null;
  tournaments_won?: number | null;
}

export interface RuleSet {
  rule_set_id: number;
  name: string;
  six_to_unlock: number;
  extra_turn_on_six: number;
  extra_turn_on_capture: number;
  extra_turn_on_home: number;
  capture_enabled: number;
  tokens_to_win: number;
  turn_seconds: number;
  tries_when_all_home: number;
  six_boost_after: number;
  is_custom: number; // 1 = a player's own rules (made for one game / tournament)
}

// The rule values a player can set for a game (sent as "custom_rules"). 0/1 = off/on.
export type CustomRules = Pick<RuleSet,
  'six_to_unlock' | 'extra_turn_on_six' | 'extra_turn_on_capture' | 'extra_turn_on_home' | 'capture_enabled' |
  'tokens_to_win' | 'turn_seconds' | 'tries_when_all_home' | 'six_boost_after'>;

// What a "start a game" screen sends: a preset, or custom rules.
export type RuleChoice = { rule_set_id: number } | { custom_rules: CustomRules };

export type MatchType = 'bot' | 'online' | 'room' | 'tournament';
export type MatchStatus = 'waiting' | 'in_progress' | 'finished' | 'cancelled';

export interface Seat {
  match_player_id: number;
  seat_no: number;
  color: LudoColor;
  player_id: number | null;
  bot_id: number | null;
  team_no: number | null;
  display_name: string;
  finish_position: number | null;
  player_type?: PlayerType | null;
  bot_difficulty?: string | null;
}

export interface Token {
  token_id: number;
  match_player_id: number;
  token_no: number;
  position: number; // -1 base, 0-50 track, 51-55 home column, 56 home
  seat_no: number;
  color: LudoColor;
  team_no: number | null;
}

export interface Match {
  match_id: number;
  match_type: MatchType;
  game_mode: 'ffa' | '2v2';
  max_players: number;
  status: MatchStatus;
  current_seat: number | null;
  dice_value: number | null;
  room_code?: string | null;
  host_id?: number | null;
  tournament_id?: number | null;
  round_no?: number | null;
  match_no?: number | null;
  scheduled_at?: string | null;
  rule_set: RuleSet;
}

export interface MatchState {
  match: Match;
  seats: Seat[];
  tokens: Token[];
  turn_deadline: number | null;
}

export interface Ranking {
  seat_no: number;
  player_id: number | null;
  bot_id: number | null;
  display_name: string;
  finish_position: number;
}

export type TournamentStatus = 'registration' | 'in_progress' | 'finished' | 'cancelled';

export interface Tournament {
  tournament_id: number;
  creator_id: number;
  creator_username: string;
  rule_set_id: number;
  rule_set_name: string;
  name: string;
  description: string | null;
  max_participants: number;
  players_per_match: number;
  start_time: string;
  round_break_minutes: number;
  status: TournamentStatus;
  current_round: number;
  participant_count: number;
  is_creator?: number;
  my_status?: string | null;
}

export interface Participant {
  participant_id: number;
  player_id: number;
  username: string;
  display_name: string;
  avatar: string | null;
  status: 'active' | 'eliminated' | 'champion';
  eliminated_round: number | null;
}

// One match of the bracket. Matches not drawn yet are "upcoming": no id, no seats, and `feeders` = the
// previous round's match numbers whose winners will play here.
export interface BracketMatch {
  match_id: number | null;
  round_no: number;
  match_no: number;
  scheduled_at: string | null;
  status: MatchStatus | 'upcoming';
  seats: Seat[];
  winner_id: number | null;
  slots: number;
  feeders: number[];
}

export interface TournamentDetail {
  tournament: Tournament;
  participants: Participant[];
  rounds: { round_no: number; matches: BracketMatch[] }[]; // the FULL bracket, round 1 → final
  total_rounds: number;
  preview: boolean; // true before the start: the tree for a full tournament
  rule_set: RuleSet;
  champion: Participant | null;
}

export interface UpcomingMatch {
  tournament_id: number;
  tournament_name: string;
  match_id: number;
  round_no: number;
  match_no: number;
  scheduled_at: string;
  status: MatchStatus;
}

export interface Friend {
  friendship_id: number;
  player_id: number;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface RoomInvitation {
  invitation_id: number;
  match_id: number;
  room_code: string;
  sender_username: string;
  sender_display_name: string;
  expires_at: string;
}

export interface TournamentInvitation {
  invitation_id: number;
  tournament_id: number;
  tournament_name: string;
  start_time: string;
  max_participants: number;
  players_per_match: number;
  sender_username: string;
  sender_display_name: string;
}

export interface HistoryMatch {
  match_id: number;
  match_type: MatchType;
  game_mode: string;
  ended_at: string;
  color: LudoColor;
  finish_position: number | null;
}
