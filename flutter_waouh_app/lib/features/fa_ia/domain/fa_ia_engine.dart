import 'dart:math';

import '../data/fa_ia_catalog.dart';
import 'fa_ia_models.dart';

class FaIaEngine {
  FaIaEngine({Random? random}) : _random = random ?? Random.secure();

  final Random _random;

  static final Map<String, FaBaseSign> _signByPattern = <String, FaBaseSign>{
    for (final sign in FaIaCatalog.baseSigns) sign.patternKey: sign,
  };

  List<FaFaceState> throwChain() => List<FaFaceState>.generate(
    8,
    (_) => _random.nextBool() ? FaFaceState.open : FaFaceState.closed,
    growable: false,
  );

  FaCombinedSign resolveFaces(List<FaFaceState> faces) {
    if (faces.length != 8) {
      throw ArgumentError.value(
        faces.length,
        'faces.length',
        'La chaîne du Fâ doit contenir exactement huit faces.',
      );
    }

    final columnA = faces
        .take(4)
        .map((face) => face.trait)
        .toList(growable: false);
    final columnB = faces
        .skip(4)
        .take(4)
        .map((face) => face.trait)
        .toList(growable: false);

    final y = resolveBaseSign(columnA);
    final x = resolveBaseSign(columnB);

    return FaCombinedSign(x: x, y: y);
  }

  FaBaseSign resolveBaseSign(List<FaTrait> pattern) {
    if (pattern.length != 4) {
      throw ArgumentError.value(
        pattern.length,
        'pattern.length',
        'Un signe fondamental doit contenir quatre positions.',
      );
    }

    final key = pattern.map((trait) => trait.symbol).join('-');
    final sign = _signByPattern[key];
    if (sign == null) {
      throw StateError('Aucun signe fondamental ne correspond à $key.');
    }
    return sign;
  }

  FaCombinedSign signByReference(String reference) {
    final parts = reference.split('-');
    if (parts.length != 2) {
      throw ArgumentError.value(
        reference,
        'reference',
        'Référence X-Y invalide.',
      );
    }
    final xNumber = int.tryParse(parts[0]);
    final yNumber = int.tryParse(parts[1]);
    if (xNumber == null ||
        yNumber == null ||
        xNumber < 1 ||
        xNumber > 16 ||
        yNumber < 1 ||
        yNumber > 16) {
      throw ArgumentError.value(
        reference,
        'reference',
        'Référence X-Y invalide.',
      );
    }
    return FaCombinedSign(
      x: FaIaCatalog.baseSigns[xNumber - 1],
      y: FaIaCatalog.baseSigns[yNumber - 1],
    );
  }

  List<FaCombinedSign> get allSigns => <FaCombinedSign>[
    for (final x in FaIaCatalog.baseSigns)
      for (final y in FaIaCatalog.baseSigns) FaCombinedSign(x: x, y: y),
  ];

  FaReading buildReading({
    required FaCombinedSign sign,
    required String category,
    required String intention,
  }) {
    final normalizedIntention = intention.trim().isEmpty
        ? 'la situation gardée intérieurement'
        : '« ${intention.trim()} »';

    final different = sign.x.number != sign.y.number;
    final traditionalCore = different
        ? 'Cette configuration associe ${sign.x.canonicalName}, lié à '
              '${sign.x.theme}, et ${sign.y.canonicalName}, lié à ${sign.y.theme}. '
              'La colonne A provient de ${sign.y.canonicalName} et la colonne B '
              'de ${sign.x.canonicalName}.'
        : '${sign.x.canonicalName}-Mêji présente deux colonnes identiques. '
              'Le thème majeur documenté est : ${sign.x.theme}.';

    final essential = different
        ? 'Le signe met en relation ${sign.x.theme} avec ${sign.y.theme}. '
              'Une évolution favorable paraît liée à la clarté, à la mesure '
              'et à la responsabilité dans les actes.'
        : 'Le signe concentre fortement le thème de ${sign.x.theme}. '
              'Il invite à reconnaître à la fois l’ouverture et la vigilance '
              'contenues dans cette énergie.';

    final contextual =
        'Dans le contexte « $category » et concernant $normalizedIntention, '
        'cette lecture symbolique attire l’attention sur ${sign.x.action}. '
        'Elle invite aussi à ${sign.y.action}. Elle ne constitue pas une '
        'prédiction certaine et doit être confrontée à la réalité de la situation.';

    final visible =
        'La situation visible peut comporter ${sign.x.light}. '
        'Il convient toutefois de vérifier si ${sign.y.shadow} influence déjà '
        'les décisions, les relations ou le rythme des événements.';

    final deep =
        'Une dynamique sous-jacente possible concerne ${sign.y.theme}. '
        'Cette hypothèse doit être comprise comme une piste de réflexion, '
        'sans accusation envers une personne et sans conclusion occulte.';

    final light =
        'Les ressources symboliques disponibles sont ${sign.x.light} et '
        '${sign.y.light}. Elles peuvent soutenir une évolution constructive '
        'si elles sont accompagnées d’actions cohérentes.';

    final shadow =
        'La vigilance concerne ${sign.x.shadow}, ainsi que ${sign.y.shadow}. '
        'Évitez les décisions prises sous l’effet de la peur, de la colère '
        'ou d’une certitude non vérifiée.';

    final temporality = sign.x.number == 9 || sign.y.number == 9
        ? 'Progressive : le signe invite particulièrement à respecter le temps '
              'de maturation et à observer les cycles.'
        : sign.x.number == 15 || sign.y.number == 15
        ? 'Immédiate à progressive : une énergie forte est présente, mais '
              'elle doit être canalisée avant l’action.'
        : 'En cours à progressive : aucun délai précis ne peut être établi '
              'à partir du corpus structurel seul.';

    final conditions =
        'L’évolution favorable dépend notamment de la capacité à '
        '${sign.x.action}, puis à ${sign.y.action}. Elle peut devenir défavorable '
        'si les avertissements du signe sont ignorés ou si la question est '
        'répétée sans observation ni action.';

    final actions = <String>[
      ...FaIaCatalog.domainActions(category),
      'Prendre un temps d’observation avant de relancer le Fâ sur la même question.',
    ];

    return FaReading(
      essentialMessage: essential,
      traditionalCore: traditionalCore,
      contextualReading: contextual,
      visibleSituation: visible,
      deepDynamic: deep,
      light: light,
      shadow: shadow,
      temporality: temporality,
      conditions: conditions,
      actions: actions.take(5).toList(growable: false),
      validationNotice: sign.isMeji
          ? 'Le thème majeur de ce signe provient du corpus documentaire fourni. '
                'Les proverbes, interdits et prescriptions doivent être validés '
                'avant publication par un Bokonon autorisé.'
          : 'Le schéma et son identité sont vérifiés mathématiquement. '
                'La synthèse contextuelle associe les thèmes documentés des deux '
                'signes fondamentaux ; elle ne remplace pas une interprétation '
                'traditionnelle validée de cette combinaison.',
    );
  }

  static String matrixText(FaCombinedSign sign) {
    final buffer = StringBuffer();
    buffer.writeln('A     B');
    for (var index = 0; index < 4; index += 1) {
      buffer.writeln(
        '${sign.columnA[index].symbol.padRight(5)} '
        '${sign.columnB[index].symbol}',
      );
    }
    return buffer.toString().trimRight();
  }
}
