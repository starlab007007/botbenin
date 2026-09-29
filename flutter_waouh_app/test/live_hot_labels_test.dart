// Fenêtres chaudes : même vocabulaire que le Web (docs/contracts/chat/hot-labels-fixtures.json)
// et garde-fou : aucun libellé « contacter » froid dans le code Flutter.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_hot_labels.dart';

Map<String, dynamic> _fixtures() =>
    jsonDecode(File('../docs/contracts/chat/hot-labels-fixtures.json').readAsStringSync()) as Map<String, dynamic>;

void main() {
  final fx = _fixtures();

  test('bouton principal selon le niveau de contactabilité (identique au Web)', () {
    (fx['contactability'] as Map<String, dynamic>).forEach((level, expected) {
      expect(liveContactabilityActionLabel(level), expected, reason: 'niveau « $level »');
    });
    expect(liveContactabilityActionLabel(null), 'Lancer la démarche');
    expect(liveContactabilityActionLabel('c5'), 'Négocier dans WAOUH');
  });

  test('recherche de canal, envoi, action radar, message d\'amorce', () {
    (fx['findChannel'] as Map<String, dynamic>).forEach((level, expected) {
      expect(liveFindChannelLabel(level), expected);
    });
    expect(liveSendOfferLabel, fx['sendOffer']);
    final radar = fx['radarPrimary'] as Map<String, dynamic>;
    expect(liveRadarPrimaryLabel(buyRequest: true), radar['buy']);
    expect(liveRadarPrimaryLabel(buyRequest: false), radar['sell']);
    final seed = fx['radarSeed'] as Map<String, dynamic>;
    expect(liveRadarInterestSeed(seed['title'] as String), seed['text']);
  });

  test('la liste des libellés froids est la même que côté Web', () {
    expect(liveColdLabels, (fx['cold'] as List).cast<String>());
  });

  test('garde-fou : aucun libellé froid dans lib/', () {
    final offenders = <String>[];
    for (final entity in Directory('lib').listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;
      if (entity.path.endsWith('live_hot_labels.dart')) continue;
      final text = entity.readAsStringSync();
      for (final cold in liveColdLabels) {
        if (text.contains(cold)) offenders.add('${entity.path}: « $cold »');
      }
    }
    expect(offenders, isEmpty);
  });
}
