import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/features/fa_ia/data/fa_web_catalog.dart';
import 'package:waouh_app_native/features/fa_ia/data/fa_web_corpus_repository.dart';
import 'package:waouh_app_native/features/fa_ia/domain/fa_web_models.dart';

class _ProjectFileAssetBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) async {
    final bytes = await File(key).readAsBytes();
    return ByteData.sublistView(Uint8List.fromList(bytes));
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
      'le FA IA répond depuis le corpus embarqué si le serveur est indisponible',
      () async {
    for (final asset in const <String>[
      'assets/fa_ia/fa_256_document_corpus.json',
      'assets/fa_ia/cowrie_open_real.png',
      'assets/fa_ia/cowrie_closed_real.png',
    ]) {
      final file = File(asset);
      expect(
        await file.exists(),
        isTrue,
        reason: 'La ressource FA doit exister dans la source: $asset',
      );
      expect(
        await file.length(),
        greaterThan(0),
        reason: 'La ressource FA ne doit pas être vide: $asset',
      );
    }

    final repository = FaWebCorpusRepository(
      bundle: _ProjectFileAssetBundle(),
    );
    final sign = FaWebCatalog.resolve(
      List<FaWebFace>.filled(8, FaWebFace.open),
    );
    final focus = FaWebCatalog.focusFor('Travail, argent et projets');

    final answer = await repository.localAnswer(
      sign: sign,
      category: 'Travail',
      intention: 'Comprendre mon projet',
      originalQuestion: 'Que dit le signe pour mon projet ?',
      focus: focus,
    );

    expect(answer.trim(), isNotEmpty);
    expect(answer, isNot(contains('momentanément indisponible')));
    expect(answer, isNot(contains('Réponse FA IA vide')));
  });
}
