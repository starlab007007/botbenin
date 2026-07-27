import '../domain/fa_web_models.dart';

class FaWebCatalog {
  const FaWebCatalog._();

  static const categories = <String>[
    'Destinée et orientation',
    'Travail et vocation',
    'Entreprise ou projet',
    'Argent et ressources',
    'Mariage et union',
    'Relation et communication',
    'Famille et lignée',
    'Conflit ou litige',
    'Voyage ou déplacement',
    'Santé et équilibre personnel',
    'Protection',
    'Apprentissage et initiation',
    'Choix entre plusieurs possibilités',
    'Compréhension d’un blocage',
    'Projet communautaire',
    'Question libre',
  ];

  static const baseSigns = <FaWebBaseSign>[
    FaWebBaseSign(
      index: 1,
      name: 'GBÉ',
      pattern: ['I', 'I', 'I', 'I'],
      theme: 'vie, renaissance et ouverture',
      light: 'renouveau, vitalité et capacité de recommencer',
      shadow: 'dispersion et impulsivité',
      action: 'clarifier ce qui doit renaître',
    ),
    FaWebBaseSign(
      index: 2,
      name: 'GOUDA',
      pattern: ['I', 'I', 'I', 'II'],
      theme: 'transmission, responsabilité et engagement collectif',
      light: 'courage de servir et transmission utile',
      shadow: 'charge excessive ou engagement mal défini',
      action: 'définir clairement les responsabilités',
    ),
    FaWebBaseSign(
      index: 3,
      name: 'LÊTÊ',
      pattern: ['I', 'I', 'II', 'I'],
      theme: 'fertilité, abondance et prospérité consciente',
      light: 'croissance progressive et ressources disponibles',
      shadow: 'excès ou impatience',
      action: 'organiser les ressources avec mesure',
    ),
    FaWebBaseSign(
      index: 4,
      name: 'LOSSO',
      pattern: ['I', 'I', 'II', 'II'],
      theme: 'alliances, destin collectif et pièges invisibles',
      light: 'coopération et force du réseau',
      shadow: 'promesse ambiguë ou alliance déséquilibrée',
      action: 'vérifier les alliances',
    ),
    FaWebBaseSign(
      index: 5,
      name: 'TOULA',
      pattern: ['I', 'II', 'I', 'I'],
      theme: 'dualité, chaos créateur et maîtrise des contraires',
      light: 'créativité et adaptation',
      shadow: 'confusion ou choix contradictoires',
      action: 'choisir une direction cohérente',
    ),
    FaWebBaseSign(
      index: 6,
      name: 'TCHÊ',
      pattern: ['I', 'II', 'I', 'II'],
      theme: 'discernement, vérité et intelligence',
      light: 'lucidité et décision juste',
      shadow: 'parole tranchante ou jugement précipité',
      action: 'chercher les faits et parler avec mesure',
    ),
    FaWebBaseSign(
      index: 7,
      name: 'DI',
      pattern: ['I', 'II', 'II', 'I'],
      theme: 'vérité cachée, épreuve et transformation',
      light: 'révélation utile et courage intérieur',
      shadow: 'secret ou blocage enfoui',
      action: 'examiner la cause réelle',
    ),
    FaWebBaseSign(
      index: 8,
      name: 'ABLA',
      pattern: ['I', 'II', 'II', 'II'],
      theme: 'service, humilité et épreuve initiatique',
      light: 'patience et utilité sociale',
      shadow: 'sacrifice de soi excessif',
      action: 'servir sans s’effacer',
    ),
    FaWebBaseSign(
      index: 9,
      name: 'SA',
      pattern: ['II', 'I', 'I', 'I'],
      theme: 'temps, cycles et maturation',
      light: 'patience et sens du rythme',
      shadow: 'retard ou répétition d’un cycle',
      action: 'respecter la temporalité',
    ),
    FaWebBaseSign(
      index: 10,
      name: 'WOLI',
      pattern: ['II', 'I', 'I', 'II'],
      theme: 'rêves, intuition et mondes cachés',
      light: 'intuition fine et perception des signaux faibles',
      shadow: 'illusion ou interprétation excessive',
      action: 'recouper l’intuition avec les faits',
    ),
    FaWebBaseSign(
      index: 11,
      name: 'FOU',
      pattern: ['II', 'I', 'II', 'I'],
      theme: 'silence, invisible et profondeur',
      light: 'écoute intérieure et prudence',
      shadow: 'isolement ou non-dit',
      action: 'ralentir et observer',
    ),
    FaWebBaseSign(
      index: 12,
      name: 'TROUKPIN',
      pattern: ['II', 'I', 'II', 'II'],
      theme: 'mémoire, réparation et retour à l’origine',
      light: 'reconnexion et réparation',
      shadow: 'oubli ou perte de repères',
      action: 'retrouver l’origine du problème',
    ),
    FaWebBaseSign(
      index: 13,
      name: 'WLIN',
      pattern: ['II', 'II', 'I', 'I'],
      theme: 'résistance, évolution lente et pouvoir intérieur',
      light: 'endurance et progrès durable',
      shadow: 'rigidité ou fatigue prolongée',
      action: 'avancer avec constance',
    ),
    FaWebBaseSign(
      index: 14,
      name: 'KA',
      pattern: ['II', 'II', 'I', 'II'],
      theme: 'volonté, combat et victoire sur l’adversité',
      light: 'force et dépassement par l’effort',
      shadow: 'conflit ou usage excessif de la force',
      action: 'agir avec fermeté et justice',
    ),
    FaWebBaseSign(
      index: 15,
      name: 'AKLAN',
      pattern: ['II', 'II', 'II', 'I'],
      theme: 'feu créateur, conflit et métamorphose',
      light: 'énergie créatrice et transformation rapide',
      shadow: 'colère ou rupture brutale',
      action: 'canaliser l’énergie avant d’agir',
    ),
    FaWebBaseSign(
      index: 16,
      name: 'YÊKOU',
      pattern: ['II', 'II', 'II', 'II'],
      theme: 'parole, justice et mémoire',
      light: 'vérité, médiation et parole réparatrice',
      shadow: 'malentendu ou parole blessante',
      action: 'réparer les non-dits et respecter la parole donnée',
    ),
  ];

  static const focuses = <FaWebFocus>[
    FaWebFocus(
      key: 'comprehensive',
      label: 'Comprendre le signe en profondeur',
      instruction:
          'Explique le message central, les forces, les difficultés, les conditions d’évolution et l’orientation juste dans le contexte précis de la consultation.',
      maxWords: 300,
    ),
    FaWebFocus(
      key: 'positive',
      label: 'Lumière et ouvertures',
      instruction:
          'Analyse les forces, protections, ouvertures et conditions favorables réellement soutenues par l’interprétation intégrale.',
      maxWords: 210,
    ),
    FaWebFocus(
      key: 'warning',
      label: 'Vigilances et obstacles',
      instruction:
          'Analyse les risques, blocages et comportements aggravants sans fatalité ni dramatisation.',
      maxWords: 210,
    ),
    FaWebFocus(
      key: 'relationship',
      label: 'Amour, famille et relations',
      instruction:
          'Analyse le couple, la famille, l’entourage, la confiance, la parole, les limites et les responsabilités.',
      maxWords: 230,
    ),
    FaWebFocus(
      key: 'work',
      label: 'Travail, argent et projets',
      instruction:
          'Analyse le travail, les ressources, l’entreprise, les projets, les opportunités et les contraintes concrètes.',
      maxWords: 230,
    ),
    FaWebFocus(
      key: 'health',
      label: 'Santé et équilibre',
      instruction:
          'Donne uniquement une lecture symbolique de l’équilibre, du rythme de vie, du repos et de la prudence, sans diagnostic ni traitement.',
      maxWords: 180,
    ),
    FaWebFocus(
      key: 'action',
      label: 'Conseils et conduite à tenir',
      instruction:
          'Transforme le message en conseils pratiques et hiérarchisés : ce qu’il faut clarifier, éviter, entreprendre et observer, sans inventer de rituel.',
      maxWords: 190,
    ),
    FaWebFocus(
      key: 'summary',
      label: 'Résumé essentiel',
      instruction:
          'Donne une synthèse concise : message principal, force, vigilance et orientation immédiate.',
      maxWords: 120,
    ),
  ];

  static FaWebResolvedSign resolve(List<FaWebFace> faces) {
    if (faces.length != 8) {
      throw StateError('Huit cauris sont requis.');
    }

    final columnA = faces.take(4).map((face) => face.trait).toList();
    final columnB = faces.skip(4).take(4).map((face) => face.trait).toList();

    final y = baseSigns.firstWhere(
      (sign) => _samePattern(sign.pattern, columnA),
    );
    final x = baseSigns.firstWhere(
      (sign) => _samePattern(sign.pattern, columnB),
    );

    final name =
        x.index == y.index ? '${x.name}-Mêji' : '${x.name} - ${y.name}';

    return FaWebResolvedSign(
      x: x,
      y: y,
      columnA: columnA,
      columnB: columnB,
      reference: '${x.index}-${y.index}',
      name: name,
      corpusKey: '${normalizeBase(x.name)}|${normalizeBase(y.name)}',
    );
  }

  static FaWebResolvedSign restore({
    required int xIndex,
    required int yIndex,
    required List<String> columnA,
    required List<String> columnB,
    required String reference,
    required String name,
    String? corpusKey,
  }) {
    final x = baseSigns[xIndex.clamp(1, 16).toInt() - 1];
    final y = baseSigns[yIndex.clamp(1, 16).toInt() - 1];
    return FaWebResolvedSign(
      x: x,
      y: y,
      columnA: columnA,
      columnB: columnB,
      reference: reference,
      name: name,
      corpusKey:
          corpusKey ?? '${normalizeBase(x.name)}|${normalizeBase(y.name)}',
    );
  }

  static FaWebFocus focusFor(String message) {
    final normalized = normalizeText(message);
    for (final focus in focuses) {
      if (normalizeText(focus.label) == normalized) return focus;
    }
    if (RegExp(r'LUMIERE|POSITIF|OUVERTURE').hasMatch(normalized)) {
      return focuses[1];
    }
    if (RegExp(r'VIGILANCE|DANGER|OBSTACLE').hasMatch(normalized)) {
      return focuses[2];
    }
    if (RegExp(r'AMOUR|FAMILLE|RELATION|MARIAGE').hasMatch(normalized)) {
      return focuses[3];
    }
    if (RegExp(r'TRAVAIL|ARGENT|PROJET|ENTREPRISE').hasMatch(normalized)) {
      return focuses[4];
    }
    if (RegExp(r'SANTE|CORPS|EQUILIBRE').hasMatch(normalized)) {
      return focuses[5];
    }
    if (RegExp(r'CONSEIL|ACTION|FAIRE|EVITER').hasMatch(normalized)) {
      return focuses[6];
    }
    if (RegExp(r'RESUME|ESSENTIEL').hasMatch(normalized)) {
      return focuses[7];
    }
    return focuses[0];
  }

  static String normalizeBase(String value) {
    final compact =
        _removeAccents(value).toUpperCase().replaceAll(RegExp('[^A-Z]'), '');
    const aliases = <String, String>{
      'YEKU': 'YEKOU',
      'GUDA': 'GOUDA',
      'TULA': 'TOULA',
      'WINLIN': 'WLIN',
      'TRUKPIN': 'TROUKPIN',
      'TRUNKPIN': 'TROUKPIN',
      'FU': 'FOU',
    };
    return aliases[compact] ?? compact;
  }

  static String normalizeText(String value) {
    return _removeAccents(value)
        .toUpperCase()
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static bool _samePattern(List<String> left, List<String> right) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index++) {
      if (left[index] != right[index]) return false;
    }
    return true;
  }

  static String _removeAccents(String value) {
    const accents = <String, String>{
      'À': 'A',
      'Á': 'A',
      'Â': 'A',
      'Ã': 'A',
      'Ä': 'A',
      'Å': 'A',
      'à': 'a',
      'á': 'a',
      'â': 'a',
      'ã': 'a',
      'ä': 'a',
      'å': 'a',
      'Ç': 'C',
      'ç': 'c',
      'È': 'E',
      'É': 'E',
      'Ê': 'E',
      'Ë': 'E',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      'Ì': 'I',
      'Í': 'I',
      'Î': 'I',
      'Ï': 'I',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'Ñ': 'N',
      'ñ': 'n',
      'Ò': 'O',
      'Ó': 'O',
      'Ô': 'O',
      'Õ': 'O',
      'Ö': 'O',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'õ': 'o',
      'ö': 'o',
      'Ù': 'U',
      'Ú': 'U',
      'Û': 'U',
      'Ü': 'U',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'Ý': 'Y',
      'Ÿ': 'Y',
      'ý': 'y',
      'ÿ': 'y',
    };
    final buffer = StringBuffer();
    for (final rune in value.runes) {
      final character = String.fromCharCode(rune);
      buffer.write(accents[character] ?? character);
    }
    return buffer.toString();
  }
}
