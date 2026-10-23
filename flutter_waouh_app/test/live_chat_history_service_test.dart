import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/live_chat_service.dart';
import 'package:waouh_app_native/live/live_session.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late HttpServer server;
  late SupabaseClient client;
  late LiveChatService service;
  final requests = <Uri>[];
  var historyAvailable = false;
  Map<String, dynamic>? historyBody;
  final identities = List.generate(211, (i) => <String, dynamic>{
    'id': 'identity-' + i.toString(), 'auth_user_id': 'auth-user', 'web_session_id': 'other-' + i.toString(),
  });
  final messages = List.generate(200, (i) => <String, dynamic>{
    'id': 'message-' + i.toString(), 'text': 'Message ' + i.toString(), 'direction': 'in',
    'created_at': DateTime.utc(2026, 10, 1).add(Duration(minutes: i)).toIso8601String(),
    'thread_id': null,
  });
  setUp(() async {
    requests.clear(); historyAvailable = false; historyBody = null;
    SharedPreferences.setMockInitialValues({'waouh_web_session_id': 'qa-session'});
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server.listen((request) async {
      requests.add(request.uri);
      request.response.headers.contentType = ContentType.json;
      if (request.uri.path == '/functions/v1/waouh-history') {
        historyBody = jsonDecode(await utf8.decoder.bind(request).join()) as Map<String, dynamic>;
        if (historyAvailable) {
          request.response.write(jsonEncode({'ok': true, 'messages': [
            messages.last,
            {...messages.first, 'id': 'deal-private', 'thread_id': 'deal-thread'},
          ]}));
        } else {
          request.response.statusCode = 503;
          request.response.write(jsonEncode({'error': 'unavailable'}));
        }
      } else if (request.uri.path.endsWith('/waouh_users')) {
        final offset = int.parse(request.uri.queryParameters['offset'] ?? '0');
        final limit = int.parse(request.uri.queryParameters['limit'] ?? '100');
        request.response.write(jsonEncode(identities.skip(offset).take(limit).toList()));
      } else if (request.uri.path.endsWith('/waouh_messages')) {
        final limit = int.parse(request.uri.queryParameters['limit'] ?? '150');
        final descending = (request.uri.queryParameters['order'] ?? '').contains('desc');
        final ordered = descending ? messages.reversed : messages;
        request.response.write(jsonEncode(ordered.take(limit).toList()));
      } else {
        request.response.write('[]');
      }
      await request.response.close();
    });
    client = SupabaseClient('http://127.0.0.1:' + server.port.toString(), 'qa-public-key');
    service = LiveChatService(client, LiveSessionStore());
  });
  tearDown(() async { await client.dispose(); await server.close(force: true); });

  test('all 211 device identities remain reachable, including the middle pages', () async {
    final ids = await service.waouhUserIds('auth-user');
    expect(ids, hasLength(211));
    expect(ids, containsAll(['identity-0', 'identity-105', 'identity-210']));
  });
  test('history fallback reads the latest messages and presents them chronologically', () async {
    final rows = await service.loadMainHistory(authUserId: 'auth-user', limit: 10);
    expect(rows.map((row) => row.id), List.generate(10, (i) => 'message-' + (190 + i).toString()));
    expect(requests.where((uri) => uri.path.endsWith('/waouh_messages')),
      everyElement(predicate<Uri>((uri) => uri.queryParameters['thread_id'] == 'is.null')));
  });
  test('main history requests an isolated scope and excludes deal messages', () async {
    historyAvailable = true;
    final rows = await service.loadMainHistory(authUserId: 'auth-user');
    expect(historyBody?['scope'], 'main');
    expect(rows.map((row) => row.id), ['message-199']);
  });
}
