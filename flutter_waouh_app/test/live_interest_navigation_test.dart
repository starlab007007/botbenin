import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/live_legacy_interest.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';

void main() {
  test(
    'an interest sends once and reuses the canonical chat thread, with photos',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final requests = <Map<String, dynamic>>[];
      final held = Completer<void>();
      server.listen((request) async {
        expect(request.uri.path, '/functions/v1/waouh-buyer-interest');
        requests.add(
          jsonDecode(await utf8.decoder.bind(request).join())
              as Map<String, dynamic>,
        );
        await held.future;
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({
            'ok': true,
            'thread_id': 'same-thread',
            'article_id': 'same-article',
            'negotiation_id': 'same-negotiation',
          }),
        );
        await request.response.close();
      });
      final client = SupabaseClient(
        'http://127.0.0.1:${server.port}',
        'test-key',
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      final item = NexusDiscoveryItem.fromJson({
        'fabric_id': 'article:same-article',
        'subject': 'Mercedes',
        'price_min': 5000000,
        'city': 'Abomey-Calavi',
        'evidence': {
          'photos': ['https://example.org/car.jpg'],
        },
      });
      try {
        final first = prepareLiveLegacyInterest(client, item);
        final second = prepareLiveLegacyInterest(client, item);
        await Future<void>.delayed(const Duration(milliseconds: 100));
        held.complete();
        final matches = await Future.wait([first, second]);
        expect(requests.length, 1);
        expect(requests.single['article_id'], 'same-article');
        expect(matches.map((m) => m.threadId).toSet(), {'same-thread'});
        expect(matches[0].key, matches[1].key);
        expect(matches[0].negotiationId, 'same-negotiation');
        expect(matches[0].photoUrls, ['https://example.org/car.jpg']);
        expect(matches[0].price, 5000000);
      } finally {
        await client.dispose();
        await server.close(force: true);
      }
    },
  );
}
