// Small helpers for showing a tournament bracket: round names, and the matches that are already drawn.
import '../models.dart';

/// "Final", "Semi-finals", "Quarter-finals", or "Round 2" for earlier rounds.
String roundName(int roundNo, int totalRounds) {
  final fromEnd = totalRounds - roundNo;
  if (fromEnd == 0) return 'Final';
  if (fromEnd == 1) return 'Semi-finals';
  if (fromEnd == 2) return 'Quarter-finals';
  return 'Round $roundNo';
}

/// Only the rounds / matches that are drawn (they have players and can be played or controlled).
/// A drawn match always has a matchId and a scheduledAt, so screens using this list can write `m.matchId!`.
List<TournamentRound> drawnRounds(List<TournamentRound> rounds) => [
      for (final r in rounds)
        if (r.matches.any((m) => m.matchId != null)) TournamentRound(r.roundNo, r.matches.where((m) => m.matchId != null).toList()),
    ];
