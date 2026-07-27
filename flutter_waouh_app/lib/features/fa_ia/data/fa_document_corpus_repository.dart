import 'dart:convert';

import 'package:flutter/services.dart';

import '../domain/fa_document_models.dart';

class FaDocumentCorpusRepository {
  const FaDocumentCorpusRepository();

  static const String assetPath = 'assets/fa_ia/fa_256_document_corpus.json';

  static Future<Map<String, FaDocumentEntry>>? _cache;

  Future<Map<String, FaDocumentEntry>> load() => _cache ??= _loadFromAssets();

  Future<FaDocumentEntry?> findByReference(String reference) async {
    final entries = await load();
    return entries[reference.trim()];
  }

  Future<Map<String, FaDocumentEntry>> _loadFromAssets() async {
    final raw = await rootBundle.loadString(assetPath);
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    final rows = decoded['entries'] as List<dynamic>? ?? const <dynamic>[];

    final result = <String, FaDocumentEntry>{};
    for (final row in rows) {
      final entry = FaDocumentEntry.fromJson(
        Map<String, dynamic>.from(row as Map),
      );
      if (entry.reference.isNotEmpty) {
        result[entry.reference] = entry;
      }
    }

    if (result.length != 256) {
      throw StateError(
        'Le corpus FA IA doit contenir exactement 256 références. '
        'Références chargées : ${result.length}.',
      );
    }
    return Map<String, FaDocumentEntry>.unmodifiable(result);
  }
}
