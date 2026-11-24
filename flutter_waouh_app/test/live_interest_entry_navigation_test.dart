import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:waouh_app_native/live/live_legacy_interest.dart';
import 'package:waouh_app_native/live/live_models.dart';

void main() {
  testWidgets(
      'a Navigator mission opens the existing chat route without a GoRouterState on its page',
      (tester) async {
    final match = LiveMatch(
        key: 'thread_existing_buyer',
        articleId: 'a',
        threadId: 'existing',
        role: 'buyer',
        title: 'Mercedes',
        lastAt: DateTime.utc(2026));
    final router = GoRouter(initialLocation: '/results', routes: [
      GoRoute(
          path: '/results',
          builder: (context, _) => Scaffold(
                  body: FilledButton(
                onPressed: () =>
                    Navigator.of(context).push(MaterialPageRoute<void>(
                        builder: (missionContext) => Scaffold(
                                body: FilledButton(
                              onPressed: () => showLiveInterestedMatch(
                                  missionContext, match),
                              child: const Text('Intéressé'),
                            )))),
                child: const Text('Mission'),
              ))),
      GoRoute(
          path: '/app/chat/match/:key',
          builder: (_, state) {
            final current = state.extra as LiveMatch;
            return Scaffold(body: Text('Salon ${current.threadId}'));
          }),
    ]);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.tap(find.text('Mission'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Intéressé'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Salon existing'), findsOneWidget);
    expect(router.routeInformationProvider.value.uri.path,
        '/app/chat/match/thread_existing_buyer');
    await tester.pumpWidget(const SizedBox.shrink());
    router.dispose();
  });
}
