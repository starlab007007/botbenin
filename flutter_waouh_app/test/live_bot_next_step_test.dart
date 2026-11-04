import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_bot_next_step.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';

class _Service implements LiveNexusService {
  int created = 0;
  bool fail = true;
  bool partial = false;

  @override
  dynamic noSuchMethod(Invocation call) {
    if (call.memberName == #createMandate) {
      created++;
      return Future<Map<String, dynamic>>.value({'mandate': {'id': 'mandate'}});
    }
    if (call.memberName == #startOpportunity) {
      if (fail || (partial && call.namedArguments[#fabricId] != 'a')) {
        return Future<NexusOpportunityJourney>.error(StateError('offline'));
      }
      return Future<NexusOpportunityJourney>.value(NexusOpportunityJourney.fromJson({
        'id': 'journey', 'fabric_id': call.namedArguments[#fabricId], 'stage': 'discovered',
      }));
    }
    return super.noSuchMethod(call);
  }
}

Future<void> mount(WidgetTester tester, _Service service, int count) async {
  await tester.binding.setSurfaceSize(const Size(500, 1100));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(
    child: LiveBotNextStep(service: service, mode: 'buy', goal: 'Stylo', city: 'Cotonou',
      budget: 1000, expanded: true,
      items: List.generate(count, (i) => NexusDiscoveryItem.fromJson({'fabric_id': String.fromCharCode(97 + i), 'subject': 'Stylo'}))),
  ))));
}

Future<void> launch(WidgetTester tester, int count) async {
  await tester.tap(find.text('Lancer la démarche'));
  await tester.pump();
  await tester.tap(find.text('Confirmer : $count contact${count > 1 ? 's' : ''} max'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('zero linked offers show an error and retry reuses the mandate', (tester) async {
    final service = _Service();
    await mount(tester, service, 1);
    await launch(tester, 1);
    expect(find.text('Suivre mes contacts'), findsNothing);
    expect(find.textContaining('Aucune offre n’a pu être prise en charge'), findsOneWidget);
    service.fail = false;
    await launch(tester, 1);
    expect(service.created, 1);
    expect(find.text('Suivre mes contacts'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('partial failures remain visible alongside the confirmed count', (tester) async {
    final service = _Service()..fail = false..partial = true;
    await mount(tester, service, 3);
    await launch(tester, 3);
    expect(find.textContaining('1 offre prise en charge'), findsOneWidget);
    expect(find.textContaining('2 offre(s) non prise(s) en charge'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
