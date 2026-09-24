import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:waouh_app_native/live/agentic/live_agentic_contracts.dart';
import 'package:waouh_app_native/live/agentic/live_agentic_controller.dart';
import 'package:waouh_app_native/live/agentic/live_agentic_repository.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_smart_timeline.dart';

const _pixel =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    'AAAADUlEQVR42mNk+M/wHwAEAQH/2p5ZvgAAAABJRU5ErkJggg==';

class _FakeRemote extends LiveAgenticRemoteService {
  _FakeRemote()
      : super(SupabaseClient('https://example.supabase.co', 'anonymous-key'));

  final calls = <String>[];

  @override
  Future<Map<String, dynamic>?> dispatch(
    String action, [
    Map<String, dynamic> payload = const <String, dynamic>{},
  ]) async {
    calls.add(action);
    if (action == 'mission.create') {
      return <String, dynamic>{
        'mission': <String, dynamic>{
          'id': '11111111-1111-4111-8111-111111111111',
          'goal': payload['goal'],
          'status': 'active',
          'created_at': '2026-09-24T10:00:00Z',
          'updated_at': '2026-09-24T10:00:00Z',
        },
      };
    }
    if (action == 'watch.create') {
      return <String, dynamic>{
        'watch': <String, dynamic>{
          'id': '22222222-2222-4222-8222-222222222222',
          'query': payload['query'],
          'target_amount': payload['target_amount'],
          'status': 'active',
          'created_at': '2026-09-24T10:00:00Z',
          'updated_at': '2026-09-24T10:00:00Z',
        },
      };
    }
    return <String, dynamic>{};
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('canonical contracts normalize legacy products and signed offers', () {
    final message = WaouhMessageContract.tryParse(<String, dynamic>{
      'schema': 'waouh.message.v1',
      'message_id': 'message-1',
      'correlation_id': 'request-1',
      'text': 'Deux résultats vérifiés.',
      'results': <Map<String, dynamic>>[
        <String, dynamic>{
          'article_id': 'article-1',
          'nom': 'Moto Bajaj',
          'prix': '425 000 FCFA',
          'ville': 'Cotonou',
          'images': <dynamic>[
            <String, dynamic>{'url': _pixel},
            <String, dynamic>{'url': 'javascript:alert(1)'},
          ],
        },
      ],
      'signed_offers': <Map<String, dynamic>>[
        <String, dynamic>{
          'schema': 'waouh.offer.v1',
          'offer_id': 'offer-1',
          'product_id': 'article-1',
          'unit_price': 420000,
          'expires_at': '2026-09-24T13:00:00Z',
        },
      ],
    });

    expect(message, isNotNull);
    expect(message!.products, hasLength(1));
    expect(message.products.single.id, 'article-1');
    expect(message.products.single.title, 'Moto Bajaj');
    expect(message.products.single.price, 425000);
    expect(message.products.single.photos, <String>[_pixel]);
    expect(message.offers.single.id, 'offer-1');
    expect(message.toJson()['schema'], waouhMessageSchemaV1);
    expect(
      (message.toLegacyMeta()['products'] as List).single['article_id'],
      'article-1',
    );
  });

  test('LiveMessage reopens canonical cards through the legacy adapter', () {
    final message = LiveMessage.fromJson(<String, dynamic>{
      'id': 'message-card',
      'direction': 'out',
      'created_at': '2026-09-24T10:00:00Z',
      'schema': 'waouh.message.v1',
      'text': 'Une option disponible.',
      'blocks': <Map<String, dynamic>>[
        <String, dynamic>{
          'type': 'product_carousel',
          'products': <Map<String, dynamic>>[
            <String, dynamic>{
              'schema': 'waouh.product.v1',
              'product_id': 'p-1',
              'title': 'Casque moto',
              'price': 18000,
              'photos': <String>[_pixel],
            },
          ],
        },
      ],
    });

    expect(message.text, 'Une option disponible.');
    expect(message.meta['schema'], waouhMessageSchemaV1);
    expect(message.meta['products'], isA<List>());
    expect((message.meta['products'] as List).single['title'], 'Casque moto');
    expect(message.attachments.single.url, _pixel);
  });

  test('missions persist, resume and ignore payment approval blocks', () async {
    final remote = _FakeRemote();
    final repository = LiveAgenticRepository(remote: remote);
    final controller = LiveAgenticController(repository: repository);
    await controller.initialize('auth:test-user');

    final missionId = await controller.ensureSynchronizedMissionForRequest(
      'Trouve-moi une moto Bajaj sous 450 000 FCFA',
      const <String, dynamic>{
        'intent': 'buy',
        'idempotency_key': 'request-one',
      },
      online: true,
    );
    expect(missionId, isNotNull);
    expect(controller.activeMissionCount, 1);

    controller.applyChannelResponse(
      requestText: 'Trouve-moi une moto Bajaj sous 450 000 FCFA',
      requestMeta: <String, dynamic>{'mission_id': missionId},
      response: <String, dynamic>{
        'ok': true,
        'schema': 'waouh.message.v1',
        'mission_id': missionId,
        'text': 'Une offre trouvée.',
        'products': <Map<String, dynamic>>[
          <String, dynamic>{
            'product_id': 'bajaj-1',
            'title': 'Bajaj Boxer',
            'price': 430000,
          },
        ],
        'blocks': <Map<String, dynamic>>[
          <String, dynamic>{
            'type': 'approval_request',
            'id': 'approval-contact',
            'action': 'contact_seller',
            'title': 'Contacter le vendeur',
          },
          <String, dynamic>{
            'type': 'approval_request',
            'id': 'approval-payment',
            'action': 'mobile_money_payment',
            'title': 'Payer',
          },
        ],
      },
    );

    expect(controller.missions.single.resultCount, 1);
    expect(controller.missions.single.status.name, 'comparing');
    expect(controller.approvals, hasLength(1));
    expect(controller.approvals.single.id, 'approval-contact');

    controller.pauseMission(missionId!);
    expect(controller.missions.single.status.name, 'paused');
    expect(controller.resumeMission(missionId), contains('Bajaj'));

    await controller.addWatch(
      productId: 'bajaj-1',
      title: 'Bajaj Boxer',
      targetPrice: 420000,
      currentPrice: 430000,
    );
    expect(controller.watches, hasLength(1));

    await Future<void>.delayed(Duration.zero);
    final restored = LiveAgenticController(repository: repository);
    await restored.initialize('auth:test-user');
    expect(restored.missions, hasLength(1));
    expect(restored.watches.single.targetPrice, 420000);
    expect(
      remote.calls,
      containsAll(<String>[
        'mission.list',
        'watch.list',
        'mission.create',
        'watch.create',
      ]),
    );
  });

  testWidgets('product carousel is usable at 320px and emits a watch action',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(320, 1150));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    String? selected;
    final message = LiveMessage.fromJson(<String, dynamic>{
      'id': 'carousel',
      'direction': 'out',
      'created_at': '2026-09-24T10:00:00Z',
      'schema': 'waouh.message.v1',
      'text': 'Deux articles.',
      'products': <Map<String, dynamic>>[
        <String, dynamic>{
          'product_id': 'p-1',
          'title': 'Produit Alpha',
          'price': 12000,
          'photos': <String>[_pixel],
        },
        <String, dynamic>{
          'product_id': 'p-2',
          'title': 'Produit Bêta',
          'price': 14000,
          'photos': <String>[_pixel],
        },
      ],
    });

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: LiveSmartTimeline(
          messages: <LiveMessage>[message],
          onPayload: (value) => selected = value,
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Article 1 sur 2'), findsOneWidget);
    expect(find.byTooltip('Article suivant'), findsOneWidget);
    expect(find.text('Suivre prix / stock'), findsNWidgets(2));

    await tester.drag(find.byType(ListView), const Offset(0, 360));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Article suivant'));
    await tester.pumpAndSettle();
    expect(find.text('Article 2 sur 2'), findsOneWidget);

    await tester.drag(find.byType(ListView), const Offset(0, -420));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Suivre prix / stock').last);
    await tester.pump();
    expect(selected, startsWith('waouh:watch?'));
    expect(selected, contains('product_id=p-2'));
  });
}
