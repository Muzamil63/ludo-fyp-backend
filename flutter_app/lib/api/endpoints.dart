// Every REST endpoint of the backend, grouped like the backend's routes/ folder.
import '../models.dart';
import 'api_client.dart';

typedef Json = Map<String, dynamic>;
List<T> _list<T>(dynamic data, T Function(Json) f) => (data as List).map((e) => f(e as Json)).toList();

class AuthApi {
  static Future<Json> guest(String deviceId, String? name) async =>
      await ApiClient.post('/auth/guest', {'device_id': deviceId, if (name != null && name.isNotEmpty) 'display_name': name}) as Json;
  static Future<Json> register(Json body) async => await ApiClient.post('/auth/register', body) as Json;
  static Future<Json> login(String login, String password) async =>
      await ApiClient.post('/auth/login', {'login': login, 'password': password}) as Json;
  static Future<Player> me() async => Player.fromJson(await ApiClient.get('/auth/me') as Json);
}

class UserApi {
  static Future<void> updateMe({String? displayName, String? avatar}) =>
      ApiClient.put('/users/me', {if (displayName != null) 'display_name': displayName, if (avatar != null) 'avatar': avatar});
  static Future<List<HistoryMatch>> myMatches() async => _list(await ApiClient.get('/users/me/matches'), HistoryMatch.fromJson);
  static Future<List<Person>> search(String q) async => _list(await ApiClient.get('/users/search?q=${Uri.encodeQueryComponent(q)}'), Person.fromJson);
  static Future<List<Person>> leaderboard() async => _list(await ApiClient.get('/users/leaderboard'), Person.fromJson);
}

class FriendApi {
  static Future<List<Person>> list() async => _list(await ApiClient.get('/friends'), Person.fromJson);
  static Future<({List<Person> received, List<Person> sent})> requests() async {
    final data = await ApiClient.get('/friends/requests') as Json;
    return (received: _list(data['received'], Person.fromJson), sent: _list(data['sent'], Person.fromJson));
  }
  static Future<void> send(String username) => ApiClient.post('/friends/requests', {'username': username});
  static Future<void> respond(int friendshipId, String action) => ApiClient.put('/friends/requests/$friendshipId', {'action': action});
  static Future<void> remove(int playerId) => ApiClient.delete('/friends/$playerId');
}

class MatchApi {
  static Future<List<RuleSet>> ruleSets() async => _list(await ApiClient.get('/rule-sets'), RuleSet.fromJson);
  static Future<int> createBot({required int ruleSetId, required int totalPlayers, required String gameMode, required String difficulty}) async {
    final data = await ApiClient.post('/matches/bot', {
      'rule_set_id': ruleSetId,
      'total_players': totalPlayers,
      'game_mode': gameMode,
      'difficulty': difficulty,
    }) as Json;
    return data['match_id'] as int;
  }
}

class RoomApi {
  static Future<Json> create({required int ruleSetId, required int maxPlayers, required String gameMode}) async =>
      await ApiClient.post('/rooms', {'rule_set_id': ruleSetId, 'max_players': maxPlayers, 'game_mode': gameMode}) as Json;
  static Future<Json> join(String code) async => await ApiClient.post('/rooms/join', {'room_code': code}) as Json;
  static Future<void> leave(int matchId) => ApiClient.post('/rooms/$matchId/leave');
  static Future<void> start(int matchId, bool fillWithBots) => ApiClient.post('/rooms/$matchId/start', {'fill_with_bots': fillWithBots});
  static Future<void> invite(int matchId, int receiverId) => ApiClient.post('/rooms/$matchId/invitations', {'receiver_id': receiverId});
  static Future<List<RoomInvite>> invitations() async => _list(await ApiClient.get('/rooms/invitations'), RoomInvite.fromJson);
  static Future<Json> respond(int invitationId, String action) async =>
      (await ApiClient.put('/rooms/invitations/$invitationId', {'action': action}) ?? <String, dynamic>{}) as Json;
}

class TournamentApi {
  static Future<List<Tournament>> list() async => _list(await ApiClient.get('/tournaments'), Tournament.fromJson);
  static Future<List<Tournament>> mine() async => _list(await ApiClient.get('/tournaments/mine'), Tournament.fromJson);
  static Future<List<UpcomingMatch>> myMatches() async => _list(await ApiClient.get('/tournaments/my-matches'), UpcomingMatch.fromJson);
  static Future<TournamentDetail> detail(int id) async => TournamentDetail.fromJson(await ApiClient.get('/tournaments/$id') as Json);
  static Future<Tournament> create(Json body) async => Tournament.fromJson(await ApiClient.post('/tournaments', body) as Json);
  static Future<void> update(int id, Json body) => ApiClient.put('/tournaments/$id', body);
  static Future<void> start(int id) => ApiClient.post('/tournaments/$id/start');
  static Future<void> cancel(int id) => ApiClient.post('/tournaments/$id/cancel');
  static Future<void> join(int id) => ApiClient.post('/tournaments/$id/register');
  static Future<void> leave(int id) => ApiClient.delete('/tournaments/$id/register');
  static Future<void> removePlayer(int id, int playerId) => ApiClient.delete('/tournaments/$id/participants/$playerId');
  static Future<void> invite(int id, int receiverId) => ApiClient.post('/tournaments/$id/invitations', {'receiver_id': receiverId});
  static Future<List<TournamentInvite>> invitations() async => _list(await ApiClient.get('/tournaments/invitations'), TournamentInvite.fromJson);
  static Future<void> respond(int invitationId, String action) => ApiClient.put('/tournaments/invitations/$invitationId', {'action': action});
  static Future<void> rescheduleMatch(int id, int matchId, DateTime at) =>
      ApiClient.put('/tournaments/$id/matches/$matchId/schedule', {'scheduled_at': at.toUtc().toIso8601String()});
  static Future<void> startMatchNow(int id, int matchId) => ApiClient.post('/tournaments/$id/matches/$matchId/start');
}
