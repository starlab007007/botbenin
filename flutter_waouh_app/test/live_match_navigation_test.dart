import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:waouh_app_native/live/live_match_navigation.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

void main() {
  testWidgets('Intéressé pousse une nouvelle page Chat Meet', (tester) async {
    final match = LiveMatch(
      key: 'pending_interest_route-test',
      articleId: 'article-route',
      role: 'buyer',
      title: 'Produit route',
      lastAt: DateTime(2026, 8, 3),
      sellerUserId: 'seller-route',
      counterpartUserId: 'seller-route',
    );

    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () => livePushMatchChat(context, match),
                child: const Text('Intéressé'),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/app/chat/match/:key',
          builder: (context, state) => Scaffold(
            body: Text('MATCH:${state.pathParameters['key']}'),
          ),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    expect(find.text('Intéressé'), findsOneWidget);

    await tester.tap(find.text('Intéressé'));
    await tester.pumpAndSettle();

    expect(find.text('MATCH:art_article-route_buyer_seller-route'),
        findsOneWidget);
    expect(router.canPop(), isTrue);
    router.pop();
    await tester.pumpAndSettle();
    expect(find.text('Intéressé'), findsOneWidget);
  });

  testWidgets(
      'un vrai payload produit ouvre avant la fin de la requête backend',
      (tester) async {
    final backend = Completer<void>();
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () {
                  final payload = liveCanonicalInterestedButtonPayload(
                    'interrer 1',
                    context: const <String, String>{
                      'article_id': 'article-real-payload',
                      'seller_user_id': 'seller-real-payload',
                      'title': 'Produit réel',
                    },
                  );
                  final text = liveCommercePayloadText(payload);
                  final meta = liveCanonicalInterestedMeta(
                    text: text,
                    meta: <String, dynamic>{
                      ...liveCommercePayloadMeta(payload),
                      'idempotency_key': 'idem-real-payload',
                    },
                  );
                  final prepared = liveBuildInterestedEntryMatch(
                    text: text,
                    requestMeta: meta,
                  );
                  unawaited(livePushMatchChat<void>(context, prepared));
                  unawaited(backend.future);
                },
                child: const Text('Je suis intéressé'),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/app/chat/match/:key',
          builder: (context, state) => Scaffold(
            body: Text('MATCH:${state.pathParameters['key']}'),
          ),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.tap(find.text('Je suis intéressé'));
    await tester.pumpAndSettle();

    expect(backend.isCompleted, isFalse);
    expect(
      find.text('MATCH:art_article-real-payload_buyer_seller-real-payload'),
      findsOneWidget,
    );
  });
}
