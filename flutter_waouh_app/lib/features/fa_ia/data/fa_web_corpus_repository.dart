import 'dart:convert';

import 'package:flutter/services.dart';

import '../data/fa_web_catalog.dart';
import '../domain/fa_web_models.dart';

class FaWebCorpusEntry {
  const FaWebCorpusEntry({
    required this.number,
    required this.text,
  });

  final int? number;
  final String text;
}

class FaWebCorpusRepository {
  FaWebCorpusRepository({AssetBundle? bundle}) : _bundle = bundle ?? rootBundle;

  static const assetPath = 'assets/fa_ia/fa_256_document_corpus.json';
  static const corpusVersion = '2026-07-23-corpus-book-256-v14';
  static const presentationVersion = '2026-07-24-corpus-presentation-v15';

  final AssetBundle _bundle;

  Map<String, FaWebCorpusEntry>? _entries;
  Set<String>? _missing;

  Future<void> load() async {
    if (_entries != null && _missing != null) return;

    final raw = await _bundle.loadString(assetPath);
    final decoded = jsonDecode(raw);
    if (decoded is! Map) {
      throw const FormatException('Corpus FA invalide.');
    }

    final root = Map<String, dynamic>.from(decoded);
    final rawEntries = root['entries'];
    final rawMissing = root['missing'];

    if (rawEntries is! Map || rawMissing is! List) {
      throw const FormatException('Structure du corpus FA invalide.');
    }

    final entries = <String, FaWebCorpusEntry>{};
    for (final item in rawEntries.entries) {
      if (item.value is! Map) continue;
      final map = Map<String, dynamic>.from(item.value as Map);
      var text = '${map['text'] ?? ''}'.trim();
      final number = _asInt(map['number']);

      final paragraphs = text
          .split(RegExp(r'\n\n+'))
          .map((part) => part.trim())
          .where((part) => part.isNotEmpty)
          .toList();
      while (paragraphs.isNotEmpty &&
          _normalizeHeading(paragraphs.last).startsWith('LES DERIVE')) {
        paragraphs.removeLast();
      }
      text = paragraphs.join('\n\n');

      if (number == 41 && text.startsWith('TRUNKPIN Est le')) {
        text = text.substring('TRUNKPIN '.length);
      }
      if (number == 126 && text.startsWith('ABLA AKLAN DO ABLAdit')) {
        text = text.substring('ABLA '.length);
      }

      entries['${item.key}'] = FaWebCorpusEntry(number: number, text: text);
    }

    final missing = rawMissing.map((value) => '$value').toSet();
    final total = entries.length + missing.length;
    final version = '${root['version'] ?? ''}';
    final documentedCount = _asInt(root['documented_count']);
    final missingCount = _asInt(root['missing_count']);

    if (version != corpusVersion ||
        documentedCount != 237 ||
        missingCount != 19 ||
        total != 256) {
      throw FormatException(
        'Corpus FA incomplet: version=$version, documentés=${entries.length}, '
        'manquants=${missing.length}, total=$total.',
      );
    }

    _entries = entries;
    _missing = missing;
  }

  Future<FaWebCorpusEntry?> entryFor(FaWebResolvedSign sign) async {
    await load();
    return _entries![sign.corpusKey];
  }

  Future<String> exactReading(FaWebResolvedSign sign) async {
    await load();
    final entry = _entries![sign.corpusKey];
    if (entry == null) return missingMessage(sign.name);
    return cleanAnswer(
        'Interprétation intégrale - ${sign.name}\n\n${entry.text}');
  }

  Future<String> transportMessage({
    required FaWebResolvedSign sign,
    required String category,
    required String intention,
    required String originalQuestion,
    required FaWebFocus focus,
  }) async {
    await load();
    final entry = _entries![sign.corpusKey];
    if (entry == null) return missingMessage(sign.name);

    return <String>[
      'DEMANDE : ${originalQuestion.trim().isEmpty ? focus.label : originalQuestion.trim()}',
      'THÈME DE CONSULTATION : ${category.trim().isEmpty ? 'Question libre' : category.trim()}',
      'INTENTION : ${intention.trim().isEmpty ? 'Non précisée' : intention.trim()}',
      'ANGLE D’ANALYSE : ${focus.label}',
      'CONSIGNE : ${focus.instruction}',
      'INTERPRÉTATION INTÉGRALE DU SIGNE ${sign.name} À UTILISER EXCLUSIVEMENT :',
      entry.text,
      'RÉPONSE ATTENDUE : français clair, précis et contextualisé, maximum ${focus.maxWords} mots. Ne mentionne aucune source, page, entrée ou livre. N’invente aucun verset, rituel, interdit ou prescription.',
    ].join('\n\n');
  }

  Future<String> localAnswer({
    required FaWebResolvedSign sign,
    required String category,
    required String intention,
    required String originalQuestion,
    required FaWebFocus focus,
  }) async {
    await load();
    final entry = _entries![sign.corpusKey];
    if (entry == null) return missingMessage(sign.name);
    if (focus.key == 'comprehensive') return exactReading(sign);

    final paragraphs = entry.text
        .split(RegExp(r'\n\n+'))
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    final query = FaWebCatalog.normalizeText(<String>[
      focus.label,
      focus.instruction,
      category,
      intention,
      originalQuestion,
    ].join(' '));
    final keywords =
        query.split(RegExp(r'\s+')).where((word) => word.length >= 4).toSet();

    final scored = <({int index, int score, String text})>[];
    for (var index = 0; index < paragraphs.length; index++) {
      final paragraph = paragraphs[index];
      final normalized = FaWebCatalog.normalizeText(paragraph);
      var score = 0;
      for (final keyword in keywords) {
        if (normalized.contains(keyword)) score += 1;
      }
      scored.add((index: index, score: score, text: paragraph));
    }
    scored.sort((a, b) {
      final byScore = b.score.compareTo(a.score);
      return byScore != 0 ? byScore : a.index.compareTo(b.index);
    });

    final selected = scored.where((item) => item.score > 0).take(5).toList();
    final effective = selected.isEmpty ? scored.take(4).toList() : selected;
    effective.sort((a, b) => a.index.compareTo(b.index));

    final maxWords = focus.maxWords.clamp(120, 700);
    final words = <String>[];
    for (final item in effective) {
      for (final word in item.text.split(RegExp(r'\s+'))) {
        if (words.length >= maxWords) break;
        words.add(word);
      }
      if (words.length >= maxWords) break;
    }
    final body = words.join(' ').trim();
    if (body.isEmpty) return exactReading(sign);

    return cleanAnswer(
      '${focus.label} — ${sign.name}\n\n$body',
    );
  }

  static String missingMessage(String name) {
    return '$name fait partie des 19 signes sur 256 dont l’interprétation '
        'n’est pas présente dans la version actuelle du corpus. Son contenu '
        'sera complété bientôt. Aucune interprétation ne sera générée ou '
        'inventée avant cette complétion.';
  }

  static String cleanAnswer(String value) {
    return value
        .replaceAll(
          RegExp(
            r'Interprétation intégrale\s+du\s+livre',
            caseSensitive: false,
          ),
          'Interprétation intégrale',
        )
        .replaceAll(
          RegExp(
            r"Texte correspondant à l[’']entrée[^\n.!?…]*(?:[.!?…]+|$)",
            caseSensitive: false,
          ),
          '',
        )
        .replaceAll(
          RegExp(
            r'^\s*(?:Référence documentaire|Référence du document|Source documentaire|Source|Page PDF|Entrée n[°o])\s*:.*$',
            caseSensitive: false,
            multiLine: true,
          ),
          '',
        )
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse('$value');
  }

  static String _normalizeHeading(String value) {
    return FaWebCatalog.normalizeText(value)
        .replaceAll(RegExp('[^A-Z ]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}
