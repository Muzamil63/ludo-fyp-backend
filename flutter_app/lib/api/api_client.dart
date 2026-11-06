// One place that talks to the REST API: adds the JWT, unwraps { success, data }, turns errors into ApiException.
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiException implements Exception {
  final String message;
  final int status;
  ApiException(this.message, [this.status = 0]);
  @override
  String toString() => message;
}

class ApiClient {
  static String serverUrl = defaultServerUrl;
  static String? token;

  static void setServerUrl(String url) => serverUrl = url.trim().replaceAll(RegExp(r'/+$'), '');

  static Future<dynamic> _request(String method, String path, [Object? body]) async {
    final uri = Uri.parse('$serverUrl/api$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final encoded = body == null ? null : jsonEncode(body);

    http.Response res;
    try {
      final Future<http.Response> call = switch (method) {
        'POST' => http.post(uri, headers: headers, body: encoded ?? '{}'),
        'PUT' => http.put(uri, headers: headers, body: encoded ?? '{}'),
        'DELETE' => http.delete(uri, headers: headers),
        _ => http.get(uri, headers: headers),
      };
      res = await call.timeout(requestTimeout);
    } on TimeoutException {
      throw ApiException('The server did not answer in time.');
    } catch (_) {
      throw ApiException("Can't reach the server at $serverUrl. Check it is running and the address in Settings.");
    }

    Map<String, dynamic> json;
    try {
      json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('The server sent an unexpected answer. Is this the Ludo backend?', res.statusCode);
    }
    if (json['success'] != true) throw ApiException((json['message'] ?? 'Something went wrong') as String, res.statusCode);
    return json['data'];
  }

  static Future<dynamic> get(String path) => _request('GET', path);
  static Future<dynamic> post(String path, [Object? body]) => _request('POST', path, body);
  static Future<dynamic> put(String path, [Object? body]) => _request('PUT', path, body);
  static Future<dynamic> delete(String path) => _request('DELETE', path);
}

/// Short readable message for any error (used in snackbars).
String errorText(Object err) => err is ApiException ? err.message : 'Something went wrong';
