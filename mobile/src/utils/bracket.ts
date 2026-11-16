// Small helpers for showing a tournament bracket: round names, and the matches that are already drawn.
import type { BracketMatch } from '../types';

// A match that exists (has an id and a start time). Upcoming bracket slots don't.
export type DrawnMatch = BracketMatch & { match_id: number; scheduled_at: string };
export type Round<M = BracketMatch> = { round_no: number; matches: M[] };

// "Final", "Semi-finals", "Quarter-finals", or "Round 2" for earlier rounds.
export function roundName(roundNo: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNo;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semi-finals';
  if (fromEnd === 2) return 'Quarter-finals';
  return `Round ${roundNo}`;
}

// Only the rounds / matches that are drawn (they have players and can be played or controlled).
export function drawnRounds(rounds: Round[]): Round<DrawnMatch>[] {
  return rounds
    .map((r) => ({ round_no: r.round_no, matches: r.matches.filter((m): m is DrawnMatch => m.match_id !== null) }))
    .filter((r) => r.matches.length > 0);
}
