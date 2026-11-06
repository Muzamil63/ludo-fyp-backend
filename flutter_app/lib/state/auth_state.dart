// Who is logged in. Keeps the JWT + player, connects the live socket after login, restores the session
// when the app opens again. Screens read it with context.watch<AuthState>() (provider package).
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../api/socket_service.dart';
import '../config.dart';
import '../models.dart';

class AuthState extends ChangeNotifier {
  static const _kToken = 'ludo.token';
  static const _kDevice = 'ludo.deviceId';
  static const _kServer = 'ludo.serverUrl';

  Player? player;
  bool booting = true;
  String serverUrl = defaultServerUrl;

  bool get isGuest => player?.isGuest ?? false;

  /// On app start: load the saved server address and token, and check the token is still valid.
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    serverUrl = prefs.getString(_kServer) ?? defaultServerUrl;
    ApiClient.setServerUrl(serverUrl);

    final token = prefs.getString(_kToken);
    if (token != null) {
      ApiClient.token = token;
      try {
        await _startSession(token, await AuthApi.me());
      } catch (_) {
        ApiClient.token = null; // expired token or server unreachable → welcome screen
      }
    }
    booting = false;
    notifyListeners();
  }

  /// Save the token, remember the player and open the live connection.
  Future<void> _startSession(String token, Player me) async {
    ApiClient.token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kToken, token);
    player = me;
    SocketService.instance.connect(ApiClient.serverUrl, token);
    notifyListeners();
  }

  /// A random id made once per install, so "Play as guest" always returns the same guest player.
  Future<String> _deviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_kDevice);
    if (id == null) {
      id = 'device-${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}-${Random().nextInt(1 << 30).toRadixString(36)}';
      await prefs.setString(_kDevice, id);
    }
    return id;
  }

  Future<void> playAsGuest(String? name) async {
    final res = await AuthApi.guest(await _deviceId(), name);
    final token = res['token'] as String;
    ApiClient.token = token;
    await _startSession(token, await AuthApi.me());
  }

  Future<void> login(String login, String password) async {
    final res = await AuthApi.login(login, password);
    final token = res['token'] as String;
    ApiClient.token = token;
    await _startSession(token, await AuthApi.me());
  }

  Future<void> register({required String username, required String email, required String password, String? displayName}) async {
    final res = await AuthApi.register({
      'username': username,
      'email': email,
      'password': password,
      if (displayName != null && displayName.isNotEmpty) 'display_name': displayName,
    });
    final token = res['token'] as String;
    ApiClient.token = token;
    await _startSession(token, await AuthApi.me());
  }

  Future<void> logout() async {
    SocketService.instance.disconnect();
    ApiClient.token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
    player = null;
    notifyListeners();
  }

  Future<void> refreshMe() async {
    player = await AuthApi.me();
    notifyListeners();
  }

  Future<void> changeServerUrl(String url) async {
    ApiClient.setServerUrl(url);
    serverUrl = ApiClient.serverUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kServer, serverUrl);
    notifyListeners();
  }
}
