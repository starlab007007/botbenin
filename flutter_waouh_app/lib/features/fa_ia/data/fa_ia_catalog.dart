import '../domain/fa_ia_models.dart';

class FaIaCatalog {
  const FaIaCatalog._();

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

  static const baseSigns = <FaBaseSign>[
    FaBaseSign(
      number: 1,
      canonicalName: 'Gbé',
      pattern: <FaTrait>[FaTrait.one, FaTrait.one, FaTrait.one, FaTrait.one],
      theme: 'vie, renaissance et ouverture',
      light: 'renouveau, vitalité, réconciliation et capacité de recommencer',
      shadow: 'dispersion, impulsivité et ouverture insuffisamment protégée',
      action: 'clarifier ce qui doit renaître et protéger ce qui commence',
      aliases: <String>['Gbê', 'GBE', 'Djo Gbé'],
    ),
    FaBaseSign(
      number: 2,
      canonicalName: 'GOUDA',
      pattern: <FaTrait>[FaTrait.one, FaTrait.one, FaTrait.one, FaTrait.two],
      theme: 'transmission, responsabilité et engagement collectif',
      light: 'courage de servir, apprentissage et transmission utile',
      shadow: 'charge excessive, dette morale ou engagement mal défini',
      action: 'définir clairement les responsabilités et tenir les engagements',
      aliases: <String>['Gouda', 'Guda', 'Gûda'],
    ),
    FaBaseSign(
      number: 3,
      canonicalName: 'LÊTÊ',
      pattern: <FaTrait>[FaTrait.one, FaTrait.one, FaTrait.two, FaTrait.one],
      theme: 'fertilité, abondance et prospérité consciente',
      light:
          'croissance progressive, fécondité des idées et ressources disponibles',
      shadow: 'excès, impatience ou prospérité sans discipline',
      action: 'faire grandir avec mesure et organiser les ressources',
      aliases: <String>['Lêtê', 'Lete', 'Lètè'],
    ),
    FaBaseSign(
      number: 4,
      canonicalName: 'LOSSO',
      pattern: <FaTrait>[FaTrait.one, FaTrait.one, FaTrait.two, FaTrait.two],
      theme: 'alliances, destin collectif et pièges invisibles',
      light: 'coopération, solidarité et force du réseau',
      shadow:
          'promesse ambiguë, influence extérieure ou alliance déséquilibrée',
      action: 'vérifier les alliances et ne rien engager sans clarté',
      aliases: <String>['Losso', 'Loso'],
    ),
    FaBaseSign(
      number: 5,
      canonicalName: 'TOULA',
      pattern: <FaTrait>[FaTrait.one, FaTrait.two, FaTrait.one, FaTrait.one],
      theme: 'dualité, chaos créateur et maîtrise des contraires',
      light: 'créativité, adaptation et capacité de réorganiser une situation',
      shadow: 'confusion, instabilité ou choix contradictoires',
      action: 'réduire la dispersion et choisir une direction cohérente',
      aliases: <String>['Toula', 'Tula', 'Tûla'],
    ),
    FaBaseSign(
      number: 6,
      canonicalName: 'TCHÊ',
      pattern: <FaTrait>[FaTrait.one, FaTrait.two, FaTrait.one, FaTrait.two],
      theme: 'discernement, vérité et purification par l’intelligence',
      light: 'lucidité, capacité d’analyse et décision juste',
      shadow: 'dureté, parole tranchante ou jugement précipité',
      action: 'chercher les faits, parler avec mesure et décider lucidement',
      aliases: <String>['Tchê', 'Tche', 'Cè'],
    ),
    FaBaseSign(
      number: 7,
      canonicalName: 'DI',
      pattern: <FaTrait>[FaTrait.one, FaTrait.two, FaTrait.two, FaTrait.one],
      theme: 'vérité cachée, épreuve et transformation profonde',
      light:
          'révélation utile, courage intérieur et capacité de transformation',
      shadow: 'secret, blocage enfoui ou résistance à une vérité nécessaire',
      action: 'examiner la cause réelle plutôt que seulement le symptôme',
      aliases: <String>['Di'],
    ),
    FaBaseSign(
      number: 8,
      canonicalName: 'ABLA',
      pattern: <FaTrait>[FaTrait.one, FaTrait.two, FaTrait.two, FaTrait.two],
      theme: 'service, humilité et épreuve initiatique',
      light: 'utilité sociale, patience et progression par le service',
      shadow:
          'sacrifice de soi excessif, fatigue ou reconnaissance insuffisante',
      action: 'servir sans s’effacer et poser des limites saines',
      aliases: <String>['Abla'],
    ),
    FaBaseSign(
      number: 9,
      canonicalName: 'SA',
      pattern: <FaTrait>[FaTrait.two, FaTrait.one, FaTrait.one, FaTrait.one],
      theme: 'temps, cycles et maturation du destin',
      light: 'patience, sens du rythme et réalisation au moment juste',
      shadow: 'retard, répétition d’un cycle ou précipitation contre le temps',
      action: 'respecter la temporalité et observer ce qui se répète',
      aliases: <String>['Sa'],
    ),
    FaBaseSign(
      number: 10,
      canonicalName: 'WOLI',
      pattern: <FaTrait>[FaTrait.two, FaTrait.one, FaTrait.one, FaTrait.two],
      theme: 'rêves, intuition et mondes cachés',
      light: 'intuition fine, imagination et perception des signaux faibles',
      shadow: 'illusion, peur ou interprétation excessive des apparences',
      action: 'recouper l’intuition avec les faits et garder le discernement',
      aliases: <String>['Woli'],
    ),
    FaBaseSign(
      number: 11,
      canonicalName: 'FOU',
      pattern: <FaTrait>[FaTrait.two, FaTrait.one, FaTrait.two, FaTrait.one],
      theme: 'silence, invisible et profondeur du mystère',
      light: 'écoute intérieure, prudence et connaissance profonde',
      shadow: 'isolement, non-dit ou confusion face à ce qui reste invisible',
      action: 'ralentir, observer et ne pas forcer une réponse prématurée',
      aliases: <String>['Fou', 'Fu'],
    ),
    FaBaseSign(
      number: 12,
      canonicalName: 'TROUKPIN',
      pattern: <FaTrait>[FaTrait.two, FaTrait.one, FaTrait.two, FaTrait.two],
      theme: 'mémoire, réparation et retour à l’origine',
      light: 'reconnexion, restitution et guérison d’une rupture ancienne',
      shadow: 'oubli, perte de repères ou répétition d’une erreur héritée',
      action: 'retrouver l’origine du problème et réparer ce qui a été rompu',
      aliases: <String>['Troukpin', 'Trukpin', 'Trupin', 'Lelo'],
    ),
    FaBaseSign(
      number: 13,
      canonicalName: 'WLIN',
      pattern: <FaTrait>[FaTrait.two, FaTrait.two, FaTrait.one, FaTrait.one],
      theme: 'résistance, évolution lente et pouvoir intérieur',
      light: 'endurance, stabilité et progrès durable',
      shadow: 'rigidité, lenteur subie ou fatigue prolongée',
      action: 'avancer avec constance sans confondre patience et immobilité',
      aliases: <String>['Wlin', 'Winlin', 'Wèlè'],
    ),
    FaBaseSign(
      number: 14,
      canonicalName: 'KA',
      pattern: <FaTrait>[FaTrait.two, FaTrait.two, FaTrait.one, FaTrait.two],
      theme: 'volonté, combat et victoire sur l’adversité',
      light: 'force, leadership et dépassement par l’effort',
      shadow: 'conflit, domination ou usage excessif de la force',
      action: 'agir avec fermeté tout en gardant justice et maîtrise',
      aliases: <String>['Ka'],
    ),
    FaBaseSign(
      number: 15,
      canonicalName: 'AKLAN',
      pattern: <FaTrait>[FaTrait.two, FaTrait.two, FaTrait.two, FaTrait.one],
      theme: 'feu créateur, conflit et métamorphose',
      light: 'énergie créatrice, courage et transformation rapide',
      shadow: 'colère, rupture brutale ou destruction par excès',
      action: 'canaliser l’énergie avant d’agir et transformer sans détruire',
      aliases: <String>['Aklan'],
    ),
    FaBaseSign(
      number: 16,
      canonicalName: 'YÊKOU',
      pattern: <FaTrait>[FaTrait.two, FaTrait.two, FaTrait.two, FaTrait.two],
      theme: 'parole, justice et mémoire',
      light: 'vérité, médiation et pouvoir réparateur de la parole',
      shadow: 'malentendu, parole blessante ou secret familial',
      action:
          'parler avec vérité, réparer les non-dits et respecter la parole donnée',
      aliases: <String>['Yêkou', 'Yékou', 'Yekou', 'Yeku'],
    ),
  ];

  static String clarifyQuestion({
    required String category,
    required String raw,
  }) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return 'Quelles forces, difficultés et conditions dois-je considérer dans le domaine « $category » ?';
    }
    final lower = trimmed.toLowerCase();
    if (lower.startsWith('est-ce que') ||
        lower.startsWith('vais-je') ||
        lower.startsWith('mon avenir') ||
        trimmed.split(RegExp(r'\s+')).length < 5) {
      return 'Quelles sont les forces, les difficultés et les conditions à considérer concernant : $trimmed ?';
    }
    return trimmed;
  }

  static List<String> domainActions(String category) {
    switch (category) {
      case 'Travail et vocation':
        return const <String>[
          'Vérifier les compétences et ressources réellement disponibles.',
          'Clarifier la prochaine étape professionnelle avant de s’engager.',
          'Demander un avis compétent sur les risques identifiés.',
        ];
      case 'Entreprise ou projet':
        return const <String>[
          'Vérifier les hypothèses, les partenaires et les moyens du projet.',
          'Protéger les informations sensibles jusqu’à clarification.',
          'Découper la décision en étapes mesurables.',
        ];
      case 'Argent et ressources':
        return const <String>[
          'Contrôler les chiffres et éviter toute promesse de gain garanti.',
          'Préserver une marge de sécurité avant une dépense importante.',
          'Consulter un professionnel pour toute décision financière engageante.',
        ];
      case 'Mariage et union':
      case 'Relation et communication':
        return const <String>[
          'Clarifier les attentes sans accusation ni menace.',
          'Écouter les faits et les besoins de chaque personne.',
          'Réparer un non-dit avant de prendre une décision définitive.',
        ];
      case 'Conflit ou litige':
        return const <String>[
          'Conserver les preuves et distinguer les faits des suppositions.',
          'Privilégier une médiation lorsque cela est possible et sûr.',
          'Consulter un juriste pour toute décision juridique.',
        ];
      case 'Santé et équilibre personnel':
        return const <String>[
          'Observer les signaux du corps sans établir de diagnostic symbolique.',
          'Consulter un professionnel de santé pour tout symptôme ou risque.',
          'Réduire les facteurs de fatigue et préserver le repos.',
        ];
      case 'Voyage ou déplacement':
        return const <String>[
          'Vérifier les documents, les conditions et les personnes impliquées.',
          'Prévoir une solution de repli réaliste.',
          'Différer le départ si une information essentielle reste incertaine.',
        ];
      case 'Choix entre plusieurs possibilités':
        return const <String>[
          'Comparer chaque option avec des critères identiques.',
          'Identifier le coût d’erreur et la possibilité de revenir en arrière.',
          'Choisir l’option la plus cohérente avec les faits et les engagements.',
        ];
      default:
        return const <String>[
          'Clarifier l’intention et distinguer les faits des impressions.',
          'Observer la situation avant de multiplier les décisions.',
          'Demander un avis qualifié lorsque l’enjeu dépasse la lecture symbolique.',
        ];
    }
  }
}
