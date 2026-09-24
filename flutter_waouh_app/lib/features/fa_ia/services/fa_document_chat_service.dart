import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/fa_document_models.dart';
import '../domain/fa_ia_models.dart';

class FaDocumentChatService {
  FaDocumentChatService({
    required this.sign,
    required this.entry,
    required this.category,
    required this.intention,
  });

  final FaCombinedSign sign;
  final FaDocumentEntry entry;
  final String category;
  final String intention;

  static const List<String> initialQuickReplies = <String>[
    'Comprendre le signe en profondeur',
    'Lumière et ouvertures',
    'Vigilances et obstacles',
    'Amour, famille et relations',
    'Travail, argent et projets',
    'Santé et équilibre',
    'Conseils et conduite à tenir',
    'Résumé essentiel',
  ];

  Future<FaChatReply> opening() async {
    if (!entry.available || entry.bestText.isEmpty) {
      return const FaChatReply(
        answer:
            'Cette combinaison ne dispose pas encore d’une interprétation '
            'suffisamment complète. Je préfère ne rien inventer. Une lecture '
            'par un Bokonon qualifié est recommandée.',
        quickReplies: const <String>[
          'Comprendre la structure du signe',
          'Consulter un Bokonon',
        ],
        mode: 'knowledge_missing',
        requiresBokonon: true,
      );
    }

    try {
      final remote = await _remoteAnswer(
        'Donne une interprétation générale détaillée et exhaustive de ce '
        'signe. Présente son sens central, ses ouvertures, ses vigilances, '
        'ses domaines de vie, les conditions d’évolution et les conseils '
        'qui ressortent de la connaissance fournie.',
        const <FaChatMessage>[],
      );
      if (remote != null && remote.answer.trim().isNotEmpty) return remote;
    } catch (_) {
      // La lecture locale fidèle reste disponible sans connexion.
    }

    return _localAnswer('Comprendre le signe en profondeur');
  }

  Future<FaChatReply> answer({
    required String userMessage,
    required List<FaChatMessage> history,
  }) async {
    final clean = userMessage.trim();
    if (clean.isEmpty) {
      return const FaChatReply(
        answer: 'Posez une question sur le signe ou choisissez un thème.',
        quickReplies: initialQuickReplies,
        mode: 'empty_question',
      );
    }

    if (!entry.available || entry.bestText.isEmpty) {
      return FaChatReply(
        answer:
            'Cette combinaison ne dispose pas encore d’une interprétation '
            'suffisamment complète. Je préfère ne rien ajouter par '
            'imagination. Une lecture humaine qualifiée est recommandée.',
        quickReplies: const <String>[
          'Comprendre la structure du signe',
          'Consulter un Bokonon',
        ],
        mode: 'knowledge_missing',
        requiresBokonon: true,
      );
    }

    try {
      final remote = await _remoteAnswer(clean, history);
      if (remote != null && remote.answer.trim().isNotEmpty) return remote;
    } catch (_) {
      // La lecture locale fidèle reste toujours disponible.
    }

    return _localAnswer(clean);
  }

  Future<FaChatReply?> _remoteAnswer(
    String userMessage,
    List<FaChatMessage> history,
  ) async {
    final client = Supabase.instance.client;
    final response = await client.functions.invoke(
      'waouh-fa-chat',
      body: buildPayload(userMessage: userMessage, history: history),
    );

    if (response.status < 200 || response.status >= 300) return null;
    if (response.data is! Map) return null;
    final data = Map<String, dynamic>.from(response.data as Map);
    if (data['ok'] != true) return null;

    final quick = (data['quick_replies'] as List<dynamic>? ?? const <dynamic>[])
        .map((item) => '$item'.trim())
        .where((item) => item.isNotEmpty)
        .where(
          (item) => !_containsAny(_normalize(item), const <String>[
            'SOURCE',
            'PAGE',
            'DOCUMENT',
            'REFERENCE',
            'TEXTE SOURCE',
          ]),
        )
        .take(8)
        .toList(growable: false);

    return FaChatReply(
      answer: _sanitizeKnowledgeVoice('${data['answer'] ?? ''}'.trim()),
      quickReplies: quick.isEmpty ? initialQuickReplies : quick,
      mode: '${data['mode'] ?? 'remote_fa_grounded'}',
      requiresBokonon: data['requires_bokonon'] == true,
    );
  }

  Map<String, dynamic> buildPayload({
    required String userMessage,
    required List<FaChatMessage> history,
  }) {
    final limitedHistory = history
        .where((message) => message.text.trim().isNotEmpty)
        .toList(growable: false);
    final start = max(0, limitedHistory.length - 10);

    return <String, dynamic>{
      'action': 'interpret',
      'sign': <String, dynamic>{
        'reference': sign.reference,
        'canonical_name': sign.canonicalName,
        'x': sign.x.canonicalName,
        'y': sign.y.canonicalName,
        'column_a': sign.columnA.map((trait) => trait.symbol).toList(),
        'column_b': sign.columnB.map((trait) => trait.symbol).toList(),
      },
      'context': <String, dynamic>{
        'category': category,
        'intention': intention,
        'locale': 'fr-BJ',
      },
      'corpus': <String, dynamic>{
        'available': entry.available,
        'document_number': entry.documentNumber,
        'title': entry.documentTitle,
        'source_file': entry.sourceFile,
        'page_start': entry.pageStart,
        'page_end': entry.pageEnd,
        'source_text': _shorten(entry.bestText, 50000),
      },
      'history': <Map<String, String>>[
        for (final message in limitedHistory.skip(start))
          <String, String>{
            'role': message.fromUser ? 'user' : 'assistant',
            'content': _shorten(message.text, 2200),
          },
      ],
      'user_message': _shorten(userMessage, 1800),
      'constraints': const <String, dynamic>{
        'document_only': true,
        'simple_french': true,
        'detail_level': 'exhaustive',
        'max_words': 900,
        'hide_sources': true,
        'speak_as_fa_knowledge': true,
        'no_invented_ritual': true,
        'no_occult_accusation': true,
      },
    };
  }

  FaChatReply _localAnswer(String userMessage) {
    final normalized = _normalize(userMessage);
    final sentences = _safeSentences(entry.bestText);
    final intent = _detectIntent(normalized);
    final keywords = <String>{
      ..._keywords(userMessage),
      ..._keywords(category),
      ..._keywords(intention),
      ..._intentKeywords(intent),
    }.toList(growable: false);

    final maxCount = switch (intent) {
      'positive' => 16,
      'warning' => 16,
      'relationship' => 16,
      'work' => 16,
      'health' => 14,
      'action' => 16,
      'context' => 18,
      'summary' => 10,
      _ => 24,
    };

    var selected = _rankSentences(
      sentences,
      keywords,
      maxCount: maxCount,
      preferOpening: intent == 'explain',
    );
    if (selected.isEmpty) {
      selected = sentences.take(maxCount).toList(growable: false);
    }

    if (selected.isEmpty) {
      return FaChatReply(
        answer:
            'Cette lecture ne contient pas assez d’éléments pour répondre '
            'avec précision à cette question. Je préfère ne rien inventer.',
        quickReplies: initialQuickReplies,
        mode: 'local_insufficient',
        requiresBokonon: true,
      );
    }

    final natural = selected.map(_naturalize).where((item) => item.isNotEmpty);
    final extracted = _paragraphs(natural.toList(growable: false));
    final answer = switch (intent) {
      'positive' => '✨ Lumière et ouvertures\n\n$extracted',
      'warning' => '⚠️ Vigilances et obstacles\n\n$extracted',
      'relationship' => '🤝 Amour, famille et relations\n\n$extracted',
      'work' => '💼 Travail, argent et projets\n\n$extracted',
      'health' =>
        '🌿 Santé et équilibre\n\n$extracted\n\nCette lecture est '
            'symbolique. Pour tout symptôme ou risque réel, un professionnel '
            'de santé qualifié doit être consulté.',
      'action' => _actionAnswer(extracted),
      'context' =>
        'Dans le contexte « $category »\n\n$extracted\n\nLa '
            'réalisation favorable dépend des conditions, des choix et des '
            'actions réellement posées.',
      'summary' => 'À retenir\n\n$extracted',
      _ => 'Lecture approfondie de ${sign.canonicalName}\n\n$extracted',
    };

    return FaChatReply(
      answer: _sanitizeKnowledgeVoice(answer),
      quickReplies: initialQuickReplies,
      mode: 'local_fa_grounded',
      requiresBokonon: _mentionsRestrictedPractice(extracted),
    );
  }

  String _actionAnswer(String extracted) {
    if (_mentionsRestrictedPractice(extracted)) {
      return '🧭 Conseils et conduite à tenir\n\n$extracted\n\nUne pratique '
          'traditionnelle réservée est évoquée. Elle doit être examinée et '
          'conduite par un Bokonon qualifié. Aucune procédure n’est donnée ici.';
    }
    return '🧭 Conseils et conduite à tenir\n\n$extracted';
  }

  String _detectIntent(String value) {
    if (_containsAny(value, <String>[
      'FAVORABLE',
      'POSITIF',
      'BON',
      'CHANCE',
      'OUVERTURE',
      'LUMIERE',
    ])) {
      return 'positive';
    }
    if (_containsAny(value, <String>[
      'RISQUE',
      'VIGILANCE',
      'DANGER',
      'NEGATIF',
      'ATTENTION',
      'OMBRE',
      'OBSTACLE',
    ])) {
      return 'warning';
    }
    if (_containsAny(value, <String>[
      'AMOUR',
      'MARIAGE',
      'COUPLE',
      'RELATION',
      'FAMILLE',
      'ENFANT',
      'UNION',
    ])) {
      return 'relationship';
    }
    if (_containsAny(value, <String>[
      'TRAVAIL',
      'ARGENT',
      'PROJET',
      'ENTREPRISE',
      'ACTIVITE',
      'METIER',
      'RESSOURCE',
      'FINANCE',
    ])) {
      return 'work';
    }
    if (_containsAny(value, <String>[
      'SANTE',
      'MALADIE',
      'EQUILIBRE',
      'CORPS',
      'GROSSESSE',
      'DOULEUR',
    ])) {
      return 'health';
    }
    if (_containsAny(value, <String>[
      'FAIRE',
      'ACTION',
      'CONSEIL',
      'RECOMMANDE',
      'CONDUITE',
      'ATTITUDE',
    ])) {
      return 'action';
    }
    if (_containsAny(value, <String>[
      'CONTEXTE',
      'SITUATION',
      'POUR MOI',
      'MON CAS',
      'INTENTION',
    ])) {
      return 'context';
    }
    if (_containsAny(value, <String>[
      'RETENIR',
      'RESUME',
      'SYNTHESE',
      'ESSENTIEL',
    ])) {
      return 'summary';
    }
    return 'explain';
  }

  List<String> _intentKeywords(String intent) => switch (intent) {
    'positive' => const <String>[
      'bonheur',
      'succès',
      'prospérité',
      'protection',
      'victoire',
      'richesse',
      'satisfaction',
      'favorable',
      'longévité',
      'bien',
      'ouverture',
      'élévation',
    ],
    'warning' => const <String>[
      'ne doit pas',
      'mal',
      'ennemi',
      'honte',
      'échec',
      'conflit',
      'trahir',
      'danger',
      'maladie',
      'mort',
      'gâter',
      'fuir',
      'obstacle',
      'prudence',
    ],
    'relationship' => const <String>[
      'amour',
      'mariage',
      'époux',
      'épouse',
      'femme',
      'homme',
      'famille',
      'enfant',
      'union',
      'relation',
      'foyer',
    ],
    'work' => const <String>[
      'travail',
      'argent',
      'richesse',
      'commerce',
      'activité',
      'projet',
      'entreprise',
      'métier',
      'réussite',
      'ressource',
    ],
    'health' => const <String>[
      'santé',
      'maladie',
      'corps',
      'grossesse',
      'douleur',
      'vie',
      'équilibre',
      'longévité',
    ],
    'action' => const <String>[
      'doit',
      'conseil',
      'sacrifice',
      'adorer',
      'respecter',
      'éviter',
      'faire',
      'offrande',
      'attitude',
      'conduite',
    ],
    'context' => _keywords(category).toList(growable: false),
    _ => const <String>[
      'signe',
      'dit',
      'personne',
      'destin',
      'vie',
      'conseil',
      'bonheur',
      'danger',
      'travail',
      'famille',
    ],
  };

  List<String> _safeSentences(String text) {
    final cleaned = _stripHeading(text).replaceAll(RegExp(r'\s+'), ' ').trim();
    if (cleaned.isEmpty) return const <String>[];

    return cleaned
        .split(RegExp(r'[.!?…»]\s+|\n+'))
        .map((sentence) => sentence.trim())
        .where((sentence) => sentence.length >= 20)
        .where((sentence) => !RegExp(r'^\d+\s*$').hasMatch(sentence))
        .toList(growable: false);
  }

  List<String> _rankSentences(
    List<String> sentences,
    List<String> keywords, {
    required int maxCount,
    bool preferOpening = false,
  }) {
    final normalizedKeywords = keywords
        .map(_normalize)
        .where((word) => word.length >= 3)
        .toSet();

    final scored = <({int index, String sentence, double score})>[];
    for (var index = 0; index < sentences.length; index += 1) {
      final sentence = sentences[index];
      final normalizedSentence = _normalize(sentence);
      var score = preferOpening ? max(0, 8 - index) * 0.38 : 0.0;
      for (final keyword in normalizedKeywords) {
        if (normalizedSentence.contains(keyword)) score += 2.0;
      }
      if (sentence.length >= 40 && sentence.length <= 460) score += 0.8;
      if (_mentionsRestrictedPractice(sentence)) score -= 0.15;
      scored.add((index: index, sentence: sentence, score: score));
    }

    scored.sort((left, right) {
      final byScore = right.score.compareTo(left.score);
      return byScore != 0 ? byScore : left.index.compareTo(right.index);
    });

    final ranked = scored
        .where((item) => item.score > 0 || preferOpening)
        .toList(growable: false);
    final selectedIndexes = <int>{};

    if (preferOpening) {
      for (var index = 0; index < min(5, sentences.length); index += 1) {
        selectedIndexes.add(index);
      }
    }

    final anchorCount = min(ranked.length, max(1, maxCount ~/ 3));
    for (final anchor in ranked.take(anchorCount)) {
      for (final index in <int>[
        anchor.index - 1,
        anchor.index,
        anchor.index + 1,
      ]) {
        if (index >= 0 && index < sentences.length) selectedIndexes.add(index);
        if (selectedIndexes.length >= maxCount) break;
      }
      if (selectedIndexes.length >= maxCount) break;
    }

    for (final item in ranked) {
      if (selectedIndexes.length >= maxCount) break;
      selectedIndexes.add(item.index);
    }

    final orderedIndexes = selectedIndexes.toList()..sort();
    return orderedIndexes
        .take(maxCount)
        .map((index) => sentences[index])
        .toList(growable: false);
  }

  String _naturalize(String value) {
    final normalizedOriginal = _normalize(value);
    if (_containsAny(normalizedOriginal, const <String>[
      'SORCELLERIE',
      'MALEDICTION',
      'ATTAQUE OCCULTE',
      'ENNEMI INVISIBLE',
    ])) {
      return 'Le langage traditionnel évoque ici des oppositions ou des '
          'influences invisibles. Cela ne permet pas d’accuser, de désigner '
          'ou de juger une personne réelle.';
    }

    var text = value.trim();
    text = text.replaceFirst(
      RegExp(r'^Celui ou celle qui a ce signe\s*', caseSensitive: false),
      'Pour la personne concernée, ',
    );
    text = text.replaceFirst(
      RegExp(r'^Celui qui a ce signe\s*', caseSensitive: false),
      'Pour la personne concernée, ',
    );
    text = text.replaceAll(
      RegExp(r'\bil ou elle doit\b', caseSensitive: false),
      'il est recommandé de',
    );
    text = text.replaceAll(
      RegExp(r'\bil doit\b', caseSensitive: false),
      'il est recommandé de',
    );
    text = text.replaceAll(
      RegExp(r'\belle doit\b', caseSensitive: false),
      'il est recommandé de',
    );
    text = text.replaceAll(
      RegExp(r'\bne doit pas\b', caseSensitive: false),
      'il est déconseillé de',
    );
    if (_containsAny(normalizedOriginal, const <String>[
      'MALADIE',
      'GROSSESSE',
      'DECES',
      'MORT',
    ])) {
      text =
          '$text Cette indication reste symbolique et ne constitue ni un '
          'diagnostic ni une annonce médicale.';
    }
    final clean = _shorten(_sanitizeKnowledgeVoice(text), 900);
    if (clean.isEmpty || RegExp(r'[.!?…:]$').hasMatch(clean)) return clean;
    return '$clean.';
  }

  String _paragraphs(List<String> sentences) {
    if (sentences.isEmpty) return '';
    final groups = <String>[];
    for (var index = 0; index < sentences.length; index += 2) {
      groups.add(sentences.skip(index).take(2).join(' '));
    }
    return groups.join('\n\n');
  }

  String _stripHeading(String value) {
    var text = value.trim();
    final title = entry.documentTitle.trim();
    if (title.isNotEmpty && entry.documentNumber != null) {
      text = text.replaceFirst(
        RegExp(
          '^\\s*${entry.documentNumber}\\s*[-–.]\\s*'
          '${RegExp.escape(title)}\\s*',
          caseSensitive: false,
        ),
        '',
      );
    }
    return text.trim();
  }

  bool _mentionsRestrictedPractice(String value) {
    final normalized = _normalize(value);
    return _containsAny(normalized, <String>[
      'SACRIFICE',
      'SANG',
      'SCARIFICATION',
      'TUER',
      'OFFRANDE',
      'RITUEL',
      'ADORER',
      'INGESTION',
      'BAIN DE',
      'TALISMAN',
    ]);
  }

  Set<String> _keywords(String value) {
    const stop = <String>{
      'AVEC',
      'DANS',
      'POUR',
      'CETTE',
      'CECI',
      'CELA',
      'QUELLE',
      'QUELS',
      'QUEL',
      'COMMENT',
      'EST',
      'SONT',
      'MON',
      'MA',
      'MES',
      'VOTRE',
      'VOUS',
      'UNE',
      'DES',
      'LES',
      'LE',
      'LA',
      'DU',
      'DE',
      'ET',
      'OU',
      'QUE',
      'QUI',
      'SIGNIFIE',
      'SIGNE',
      'EXPLIQUE',
      'MOI',
      'FAUT',
      'DOIS',
    };
    return _normalize(value)
        .split(' ')
        .where((word) => word.length >= 3 && !stop.contains(word))
        .toSet();
  }

  bool _containsAny(String value, List<String> needles) =>
      needles.any((needle) => value.contains(_normalize(needle)));

  String _normalize(String value) {
    const accents = <String, String>{
      'À': 'A',
      'Â': 'A',
      'Ä': 'A',
      'Á': 'A',
      'Ã': 'A',
      'Ç': 'C',
      'É': 'E',
      'È': 'E',
      'Ê': 'E',
      'Ë': 'E',
      'Î': 'I',
      'Ï': 'I',
      'Í': 'I',
      'Ô': 'O',
      'Ö': 'O',
      'Ó': 'O',
      'Ù': 'U',
      'Û': 'U',
      'Ü': 'U',
      'Ú': 'U',
      'Ÿ': 'Y',
    };
    var result = value.toUpperCase();
    accents.forEach((source, replacement) {
      result = result.replaceAll(source, replacement);
    });
    return result
        .replaceAll(RegExp(r'[^A-Z0-9]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static String _sanitizeKnowledgeVoice(String value) {
    var text = value.trim();
    final replacements = <RegExp, String>{
      RegExp(r'\bselon le document\s*[:,]?\s*', caseSensitive: false): '',
      RegExp(r'\ble document recommande de\b', caseSensitive: false):
          'il est recommandé de',
      RegExp(r'\ble document indique que\b', caseSensitive: false):
          'ce signe indique que',
      RegExp(r'\ble document précise que\b', caseSensitive: false):
          'la lecture précise que',
      RegExp(r'\ble document met en garde contre\b', caseSensitive: false):
          'une vigilance est nécessaire concernant',
      RegExp(r'\bdans le document\b', caseSensitive: false):
          'dans cette lecture',
      RegExp(r'\bce document\b', caseSensitive: false): 'cette lecture',
      RegExp(r'\bdu document\b', caseSensitive: false): 'de cette lecture',
      RegExp(r'\bau document\b', caseSensitive: false): 'à cette lecture',
      RegExp(r"\bd[’']après le document\s*[:,]?\s*", caseSensitive: false): '',
      RegExp(r'\bselon la source\s*[:,]?\s*', caseSensitive: false): '',
      RegExp(r'\ble passage documentaire\b', caseSensitive: false):
          'la lecture',
      RegExp(r'\ble passage\b', caseSensitive: false): 'la lecture',
      RegExp(r'\ble corpus\b', caseSensitive: false): 'la connaissance du Fâ',
      RegExp(r'\bce texte\b', caseSensitive: false): 'cet enseignement',
      RegExp(r'\ble texte\b', caseSensitive: false): 'l’enseignement',
      RegExp(r'\bsource\s*:[^\n]+', caseSensitive: false): '',
      RegExp(r'\bsource documentaire\b', caseSensitive: false): '',
      RegExp(r'\bréférence\s*[:#]?\s*[0-9-]+\b', caseSensitive: false): '',
      RegExp(r'\bpages?\s+\d+(?:[–-]\d+)?\b', caseSensitive: false): '',
      RegExp(r'\b(?:document|source|page|référence)\b', caseSensitive: false):
          '',
    };
    replacements.forEach((pattern, replacement) {
      text = text.replaceAll(pattern, replacement);
    });
    return text
        .replaceAll(RegExp(r'[ \t]+\n'), '\n')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .replaceAll(RegExp(r' {2,}'), ' ')
        .trim();
  }

  static String _shorten(String value, int maxLength) {
    final clean = value.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (clean.length <= maxLength) return clean;
    final cut = clean.substring(0, maxLength);
    final lastSpace = cut.lastIndexOf(' ');
    return '${cut.substring(0, lastSpace > maxLength ~/ 2 ? lastSpace : maxLength).trim()}…';
  }
}
