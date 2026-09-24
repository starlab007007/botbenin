import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/features/fa_ia/domain/fa_web_models.dart';
import 'package:waouh_app_native/features/fa_ia/presentation/fa_web_widgets.dart';

void main() {
  testWidgets('le résultat affiche huit cauris et huit signes sans rognage',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 820));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    const faces = <FaWebFace>[
      FaWebFace.open,
      FaWebFace.closed,
      FaWebFace.open,
      FaWebFace.closed,
      FaWebFace.closed,
      FaWebFace.open,
      FaWebFace.closed,
      FaWebFace.open,
    ];

    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.all(12),
            child: FaWebChainCard(
              faces: faces,
              phase: 'Gbé–Yêkou',
              showTraits: true,
              height: 650,
            ),
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    for (var index = 0; index < 8; index += 1) {
      expect(find.byKey(ValueKey<String>('fa-cowrie-$index')), findsOneWidget);
      expect(find.byKey(ValueKey<String>('fa-trait-$index')), findsOneWidget);
    }
    expect(find.text('I'), findsNWidgets(4));
    expect(find.text('II'), findsNWidgets(4));
    expect(find.text('A'), findsOneWidget);
    expect(find.text('B'), findsOneWidget);
  });
}
