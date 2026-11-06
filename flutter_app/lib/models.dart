// Data the backend sends, turned into Dart classes. Field names follow the API (snake_case in JSON).
// Game-state classes (MatchInfo, Seat, Token) are mutable on purpose: the game screen updates them
// from live socket events and then calls setState().
import 'theme.dart';

int _int(dynamic v) => v is int ? v : int.parse('$v');
int? _intOrNull(dynamic v) => v == null ? null : _int(v);
DateTime _date(dynamic v) => DateTime.parse(v as String).toLocal();
DateTime? _dateOrNull(dynamic v) => v == null ? null : _date(v);

class Player {
  final int playerId;
  final String displayName;
  final String? avatar;
  final String playerType; // 'guest' | 'registered'
  final String? username;
  final int gamesPlayed;
  final int gamesWon;
  final int tournamentsWon;

  Player.fromJson(Map<String, dynamic> j)
      : playerId = _int(j['player_id']),
        displayName = j['display_name'] as String,
        avatar = j['avatar'] as String?,
        playerType = j['player_type'] as String,
        username = j['username'] as String?,
        gamesPlayed = _intOrNull(j['games_played']) ?? 0,
        gamesWon = _intOrNull(j['games_won']) ?? 0,
        tournamentsWon = _intOrNull(j['tournaments_won']) ?? 0;

  bool get isGuest => playerType == 'guest';
}

class RuleSet {
  final int ruleSetId;
  final String name;
  final bool sixToUnlock;
  final int tokensToWin;
  final int turnSeconds;

  RuleSet.fromJson(Map<String, dynamic> j)
      : ruleSetId = _int(j['rule_set_id']),
        name = j['name'] as String,
        sixToUnlock = _int(j['six_to_unlock']) == 1,
        tokensToWin = _int(j['tokens_to_win']),
        turnSeconds = _int(j['turn_seconds']);

  String get hint => '$tokensToWin home · ${turnSeconds}s';
}

class Seat {
  final int matchPlayerId;
  final int seatNo;
  final LudoColor color;
  final int? playerId;
  final int? botId;
  final int? teamNo;
  final String displayName;
  int? finishPosition;

  Seat.fromJson(Map<String, dynamic> j)
      : matchPlayerId = _int(j['match_player_id']),
        seatNo = _int(j['seat_no']),
        color = ludoColorFromName(j['color'] as String),
        playerId = _intOrNull(j['player_id']),
        botId = _intOrNull(j['bot_id']),
        teamNo = _intOrNull(j['team_no']),
        displayName = j['display_name'] as String,
        finishPosition = _intOrNull(j['finish_position']);
}

class Token {
  final int tokenId;
  final int tokenNo;
  final int seatNo;
  final LudoColor color;
  int position; // -1 base, 0-50 track, 51-55 home column, 56 home

  Token.fromJson(Map<String, dynamic> j)
      : tokenId = _int(j['token_id']),
        tokenNo = _int(j['token_no']),
        seatNo = _int(j['seat_no']),
        color = ludoColorFromName(j['color'] as String),
        position = _int(j['position']);
}

class MatchInfo {
  final int matchId;
  final String matchType; // bot | online | room | tournament
  final String gameMode; // ffa | 2v2
  final int maxPlayers;
  String status; // waiting | in_progress | finished | cancelled
  int? currentSeat;
  int? diceValue;
  final String? roomCode;
  final int? hostId;
  final int? tournamentId;
  final int? roundNo;
  final int? matchNo;
  final DateTime? scheduledAt;
  final RuleSet ruleSet;

  MatchInfo.fromJson(Map<String, dynamic> j)
      : matchId = _int(j['match_id']),
        matchType = j['match_type'] as String,
        gameMode = j['game_mode'] as String,
        maxPlayers = _int(j['max_players']),
        status = j['status'] as String,
        currentSeat = _intOrNull(j['current_seat']),
        diceValue = _intOrNull(j['dice_value']),
        roomCode = j['room_code'] as String?,
        hostId = _intOrNull(j['host_id']),
        tournamentId = _intOrNull(j['tournament_id']),
        roundNo = _intOrNull(j['round_no']),
        matchNo = _intOrNull(j['match_no']),
        scheduledAt = _dateOrNull(j['scheduled_at']),
        ruleSet = RuleSet.fromJson(j['rule_set'] as Map<String, dynamic>);
}

class MatchState {
  final MatchInfo match;
  final List<Seat> seats;
  final List<Token> tokens;
  final int? turnDeadline; // milliseconds since epoch

  MatchState.fromJson(Map<String, dynamic> j)
      : match = MatchInfo.fromJson(j['match'] as Map<String, dynamic>),
        seats = (j['seats'] as List).map((s) => Seat.fromJson(s as Map<String, dynamic>)).toList(),
        tokens = (j['tokens'] as List).map((t) => Token.fromJson(t as Map<String, dynamic>)).toList(),
        turnDeadline = _intOrNull(j['turn_deadline']);
}

class Ranking {
  final int seatNo;
  final int? playerId;
  final int? botId;
  final String displayName;
  final int finishPosition;

  Ranking({required this.seatNo, this.playerId, this.botId, required this.displayName, required this.finishPosition});

  Ranking.fromJson(Map<String, dynamic> j)
      : seatNo = _int(j['seat_no']),
        playerId = _intOrNull(j['player_id']),
        botId = _intOrNull(j['bot_id']),
        displayName = j['display_name'] as String,
        finishPosition = _int(j['finish_position']);
}

class Tournament {
  final int tournamentId;
  final int creatorId;
  final String creatorUsername;
  final int ruleSetId;
  final String ruleSetName;
  final String name;
  final String? description;
  final int maxParticipants;
  final int playersPerMatch;
  final DateTime startTime;
  final int roundBreakMinutes;
  final String status; // registration | in_progress | finished | cancelled
  final int currentRound;
  final int participantCount;
  final bool isCreator;
  final String? myStatus;

  Tournament.fromJson(Map<String, dynamic> j)
      : tournamentId = _int(j['tournament_id']),
        creatorId = _int(j['creator_id']),
        creatorUsername = j['creator_username'] as String,
        ruleSetId = _int(j['rule_set_id']),
        ruleSetName = j['rule_set_name'] as String,
        name = j['name'] as String,
        description = j['description'] as String?,
        maxParticipants = _int(j['max_participants']),
        playersPerMatch = _int(j['players_per_match']),
        startTime = _date(j['start_time']),
        roundBreakMinutes = _int(j['round_break_minutes']),
        status = j['status'] as String,
        currentRound = _int(j['current_round']),
        participantCount = _intOrNull(j['participant_count']) ?? 0,
        isCreator = (_intOrNull(j['is_creator']) ?? 0) == 1,
        myStatus = j['my_status'] as String?;

  String get formatLabel => playersPerMatch == 2 ? '1 vs 1' : '4 players';
}

class Participant {
  final int participantId;
  final int playerId;
  final String username;
  final String displayName;
  final String? avatar;
  final String status; // active | eliminated | champion
  final int? eliminatedRound;

  Participant.fromJson(Map<String, dynamic> j)
      : participantId = _int(j['participant_id']),
        playerId = _int(j['player_id']),
        username = j['username'] as String,
        displayName = j['display_name'] as String,
        avatar = j['avatar'] as String?,
        status = j['status'] as String,
        eliminatedRound = _intOrNull(j['eliminated_round']);
}

class BracketMatch {
  final int matchId;
  final int roundNo;
  final int matchNo;
  final DateTime scheduledAt;
  final String status;
  final List<Seat> seats;
  final int? winnerId;

  BracketMatch.fromJson(Map<String, dynamic> j)
      : matchId = _int(j['match_id']),
        roundNo = _int(j['round_no']),
        matchNo = _int(j['match_no']),
        scheduledAt = _date(j['scheduled_at']),
        status = j['status'] as String,
        seats = (j['seats'] as List).map((s) => Seat.fromJson(s as Map<String, dynamic>)).toList(),
        winnerId = _intOrNull(j['winner_id']);

  bool get isOpen => status == 'waiting' || status == 'in_progress';
}

class TournamentRound {
  final int roundNo;
  final List<BracketMatch> matches;
  TournamentRound.fromJson(Map<String, dynamic> j)
      : roundNo = _int(j['round_no']),
        matches = (j['matches'] as List).map((m) => BracketMatch.fromJson(m as Map<String, dynamic>)).toList();
}

class TournamentDetail {
  final Tournament tournament;
  final List<Participant> participants;
  final List<TournamentRound> rounds;
  final Participant? champion;

  TournamentDetail.fromJson(Map<String, dynamic> j)
      : tournament = Tournament.fromJson(j['tournament'] as Map<String, dynamic>),
        participants = (j['participants'] as List).map((p) => Participant.fromJson(p as Map<String, dynamic>)).toList(),
        rounds = (j['rounds'] as List).map((r) => TournamentRound.fromJson(r as Map<String, dynamic>)).toList(),
        champion = j['champion'] == null ? null : Participant.fromJson(j['champion'] as Map<String, dynamic>);
}

class UpcomingMatch {
  final int tournamentId;
  final String tournamentName;
  final int matchId;
  final int roundNo;
  final int matchNo;
  final DateTime scheduledAt;
  final String status;

  UpcomingMatch.fromJson(Map<String, dynamic> j)
      : tournamentId = _int(j['tournament_id']),
        tournamentName = j['tournament_name'] as String,
        matchId = _int(j['match_id']),
        roundNo = _int(j['round_no']),
        matchNo = _int(j['match_no']),
        scheduledAt = _date(j['scheduled_at']),
        status = j['status'] as String;
}

/// A person in a list: friend, friend request, search result or leaderboard row.
class Person {
  final int playerId;
  final int? friendshipId;
  final String username;
  final String displayName;
  final String? avatar;
  final int gamesPlayed;
  final int gamesWon;

  Person.fromJson(Map<String, dynamic> j)
      : playerId = _int(j['player_id']),
        friendshipId = _intOrNull(j['friendship_id']),
        username = j['username'] as String,
        displayName = j['display_name'] as String,
        avatar = j['avatar'] as String?,
        gamesPlayed = _intOrNull(j['games_played']) ?? 0,
        gamesWon = _intOrNull(j['games_won']) ?? 0;
}

class RoomInvite {
  final int invitationId;
  final int matchId;
  final String roomCode;
  final String senderName;

  RoomInvite.fromJson(Map<String, dynamic> j)
      : invitationId = _int(j['invitation_id']),
        matchId = _int(j['match_id']),
        roomCode = j['room_code'] as String,
        senderName = j['sender_display_name'] as String;
}

class TournamentInvite {
  final int invitationId;
  final int tournamentId;
  final String tournamentName;
  final DateTime startTime;
  final int maxParticipants;
  final int playersPerMatch;
  final String senderName;

  TournamentInvite.fromJson(Map<String, dynamic> j)
      : invitationId = _int(j['invitation_id']),
        tournamentId = _int(j['tournament_id']),
        tournamentName = j['tournament_name'] as String,
        startTime = _date(j['start_time']),
        maxParticipants = _int(j['max_participants']),
        playersPerMatch = _int(j['players_per_match']),
        senderName = j['sender_display_name'] as String;
}

class HistoryMatch {
  final int matchId;
  final String matchType;
  final DateTime endedAt;
  final LudoColor color;
  final int? finishPosition;

  HistoryMatch.fromJson(Map<String, dynamic> j)
      : matchId = _int(j['match_id']),
        matchType = j['match_type'] as String,
        endedAt = _date(j['ended_at']),
        color = ludoColorFromName(j['color'] as String),
        finishPosition = _intOrNull(j['finish_position']);
}
