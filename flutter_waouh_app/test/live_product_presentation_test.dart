import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_product_presentation.dart';
import 'package:waouh_app_native/live/live_mission_feed.dart';

void main() {
  final photos = List.generate(7, (i) => 'https://images.example/$i.jpg');
  test('product photos stay ordered, unique and limited to four', () {
    expect(
      liveProductPhotos({
        'evidence': {
          'primary_photo_url': photos[2],
          'photos': [
            photos[2],
            ' ${photos[0]} ',
            {'url': photos[1]},
            'javascript:bad',
            ...photos,
          ],
        },
      }),
      [photos[2], photos[0], photos[1], photos[3]],
    );
  });
  test('a journey uses its own product snapshot at any stage', () {
    for (final stage in [
      'discovered',
      'waiting_reply',
      'negotiating',
      'completed',
    ]) {
      final p = LiveProductData({
        'stage': stage,
        'photos': [photos[6]],
        'metadata': {
          'product_snapshot': {
            'id': 'a',
            'title': 'Produit A',
            'photos': photos,
            'price_min': 250000,
            'currency': 'XOF',
            'attributes': [
              {'label': 'Capacité', 'value': '256 Go'},
            ],
          },
        },
      });
      expect(p.title, 'Produit A');
      expect(p.photos, photos.take(4));
      expect(p.price, '250 000 F CFA');
      expect(p.attributes['Capacité'], '256 Go');
    }
    expect(
      LiveProductData({'title': 'Sans prix', 'price': 0}).price,
      'Prix à préciser',
    );
  });
  test('a failed section cannot discard the other mission sections', () async {
    final parts = await Future.wait([
      readMissionPart(() async => ['mission conservée']),
      readMissionPart<List<String>>(() async => throw Exception('offline')),
    ]);
    expect(parts[0].value, ['mission conservée']);
    expect(parts[0].failed, isFalse);
    expect(parts[1].failed, isTrue);
    expect(missionRetryDelay(1), const Duration(seconds: 5));
    expect(missionRetryDelay(5), const Duration(seconds: 30));
  });
  testWidgets(
    'four-picture gallery fits a narrow screen and changes pictures',
    (tester) async {
      tester.view.physicalSize = const Size(320, 780);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(20),
              child: LiveProductGallery(
                photos: photos,
                title: 'Produit A',
                detail: true,
              ),
            ),
          ),
        ),
      );
      expect(find.text('1 / 4'), findsOneWidget);
      expect(find.byTooltip('Photo suivante'), findsOneWidget);
      await tester.tap(find.byTooltip('Photo suivante'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('2 / 4'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LiveProductGallery(
              photos: [photos.last],
              title: 'Produit B',
              detail: true,
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('1 / 1'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
