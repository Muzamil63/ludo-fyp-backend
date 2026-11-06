// The live connection (Socket.IO) used for playing, matchmaking, lobbies and notifications.
// Screens subscribe with SocketService.instance.on('event', handler) and get back a function to unsubscribe.
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';

class SocketService {
  SocketService._();
  static final SocketService instance = SocketService._();

  io.Socket? _socket;
  final ValueNotifier<bool> connected = ValueNotifier(false);
  final Map<String, List<void Function(dynamic)>> _listeners = {};

  // Every server → app event the app uses (see the backend CLAUDE.md §9).
  static const _events = [
    'match:state', 'game:turn', 'game:rolled', 'game:moved', 'match:finished', 'match:cancelled',
    'room:updated', 'queue:waiting', 'queue:matched', 'invite:received',
    'tournament:invited', 'tournament:match_ready', 'tournament:lobby', 'tournament:match_started', 'tournament:updated',
  ];

  void connect(String serverUrl, String token) {
    disconnect();
    final s = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableForceNew()
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );
    s.onConnect((_) => connected.value = true);
    s.onDisconnect((_) => connected.value = false);
    for (final event in _events) {
      s.on(event, (data) => _dispatch(event, data));
    }
    s.connect();
    _socket = s;
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    connected.value = false;
  }

  /// Listen to an event. Call the returned function (e.g. in dispose()) to stop listening.
  VoidCallback on(String event, void Function(dynamic data) handler) {
    _listeners.putIfAbsent(event, () => []).add(handler);
    return () => _listeners[event]?.remove(handler);
  }

  void _dispatch(String event, dynamic data) {
    for (final handler in List.of(_listeners[event] ?? const <void Function(dynamic)>[])) {
      handler(data);
    }
  }

  /// Sends an event and waits for the server's answer ({ success, data } or { success: false, message }).
  Future<dynamic> emitAck(String event, [Map<String, dynamic> data = const {}]) {
    final s = _socket;
    if (s == null || !s.connected) {
      return Future.error(ApiException('Not connected to the game server. Please wait a moment.'));
    }
    final completer = Completer<dynamic>();
    s.emitWithAck(event, data, ack: (dynamic res) {
      if (completer.isCompleted) return;
      final answer = res is List && res.isNotEmpty ? res.first : res;
      if (answer is Map && answer['success'] == true) {
        completer.complete(answer['data']);
      } else {
        final message = answer is Map ? (answer['message'] ?? 'Something went wrong') : 'Something went wrong';
        completer.completeError(ApiException('$message'));
      }
    });
    return completer.future.timeout(const Duration(seconds: 12), onTimeout: () => throw ApiException('The server did not answer in time.'));
  }
}
