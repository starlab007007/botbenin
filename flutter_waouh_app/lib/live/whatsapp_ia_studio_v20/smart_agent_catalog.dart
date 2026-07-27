import 'package:flutter/material.dart';

enum SmartAgentSourceKind {
  smart,
  catalog,
  documents,
  website,
  knowledge,
}

class SmartAgentSourceDefinition {
  const SmartAgentSourceDefinition({
    required this.kind,
    required this.label,
    required this.description,
    required this.icon,
    required this.backendType,
  });

  final SmartAgentSourceKind kind;
  final String label;
  final String description;
  final IconData icon;
  final String backendType;
}

class SmartSectorTemplate {
  const SmartSectorTemplate({
    required this.id,
    required this.label,
    required this.emoji,
    required this.description,
    required this.personaName,
    required this.tone,
    required this.capabilities,
    required this.starterFaq,
    required this.dataPrompts,
    required this.keywords,
  });

  final String id;
  final String label;
  final String emoji;
  final String description;
  final String personaName;
  final String tone;
  final Map<String, bool> capabilities;
  final List<Map<String, String>> starterFaq;
  final List<String> dataPrompts;
  final List<String> keywords;

  String get starterKnowledge {
    if (starterFaq.isEmpty) return '';
    return starterFaq
        .map(
          (item) => 'Q : ${item['q']}\nR : ${item['a']}',
        )
        .join('\n\n');
  }
}

class SmartTemplateRecommendation {
  const SmartTemplateRecommendation({
    required this.template,
    required this.confidence,
    required this.reason,
  });

  final SmartSectorTemplate template;
  final double confidence;
  final String reason;
}

class SmartAgentCatalog {
  const SmartAgentCatalog._();

  static const sources = <SmartAgentSourceDefinition>[
    SmartAgentSourceDefinition(
      kind: SmartAgentSourceKind.smart,
      label: 'Agent intelligent complet',
      description: 'Combine site, documents, catalogue et connaissances.',
      icon: Icons.auto_awesome_rounded,
      backendType: 'commerce',
    ),
    SmartAgentSourceDefinition(
      kind: SmartAgentSourceKind.catalog,
      label: 'Catalogue / Données',
      description: 'Produits, services, prix, disponibilités et commandes.',
      icon: Icons.inventory_2_outlined,
      backendType: 'commerce',
    ),
    SmartAgentSourceDefinition(
      kind: SmartAgentSourceKind.documents,
      label: 'Documents',
      description: 'PDF, DOCX, TXT, procédures, règlements et brochures.',
      icon: Icons.description_outlined,
      backendType: 'docs',
    ),
    SmartAgentSourceDefinition(
      kind: SmartAgentSourceKind.website,
      label: 'Site web',
      description: 'Analyse et indexe automatiquement les pages du site.',
      icon: Icons.language_rounded,
      backendType: 'website',
    ),
    SmartAgentSourceDefinition(
      kind: SmartAgentSourceKind.knowledge,
      label: 'FAQ / Connaissances',
      description: 'Informations saisies, questions fréquentes et lien public.',
      icon: Icons.psychology_alt_outlined,
      backendType: 'docs',
    ),
  ];

  static const sectors = <SmartSectorTemplate>[
    SmartSectorTemplate(
      id: 'commerce',
      label: 'Boutique / Commerce',
      emoji: '🛍️',
      description:
          'Catalogue, commandes, disponibilité, livraison et paiement.',
      personaName: 'Aïcha',
      tone: 'chaleureux, vendeur, précis et rapide',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quels produits sont disponibles ?',
          'a':
              'Je vérifie le catalogue et vous propose les options disponibles.',
        },
        {
          'q': 'Livrez-vous ?',
          'a': 'Je peux vérifier la zone, le délai et le coût de livraison.',
        },
      ],
      dataPrompts: [
        'Produits et variantes',
        'Prix et promotions',
        'Stock et disponibilité',
        'Zones de livraison',
        'Modes de paiement',
      ],
      keywords: [
        'boutique',
        'commerce',
        'magasin',
        'produit',
        'vente',
        'shop',
        'mode',
        'cosmetique',
        'électronique',
      ],
    ),
    SmartSectorTemplate(
      id: 'restaurant',
      label: 'Restaurant / Restauration',
      emoji: '🍽️',
      description: 'Menu, commandes, livraison, réservation et horaires.',
      personaName: 'Komi',
      tone: 'accueillant, gourmand, rapide et orienté commande',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': false,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quel est le menu du jour ?',
          'a':
              'Je vous présente les plats, accompagnements et prix disponibles.',
        },
        {
          'q': 'Puis-je réserver une table ?',
          'a': 'Oui. Indiquez la date, l’heure et le nombre de personnes.',
        },
      ],
      dataPrompts: [
        'Menu et prix',
        'Plats indisponibles',
        'Zone de livraison',
        'Temps de préparation',
        'Réservation de table',
      ],
      keywords: [
        'restaurant',
        'repas',
        'menu',
        'cuisine',
        'food',
        'livraison',
        'traiteur',
        'bar',
        'cafe',
      ],
    ),
    SmartSectorTemplate(
      id: 'clinic',
      label: 'Clinique / Cabinet médical',
      emoji: '🏥',
      description:
          'Informations, rendez-vous, orientation et transfert humain.',
      personaName: 'Mélanie',
      tone: 'professionnel, rassurant, prudent et confidentiel',
      capabilities: {
        'qa': true,
        'sell': false,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Comment prendre rendez-vous ?',
          'a': 'Indiquez la spécialité, le jour souhaité et vos coordonnées.',
        },
        {
          'q': 'Est-ce une urgence ?',
          'a':
              'En cas d’urgence ou de signe grave, contactez immédiatement les services d’urgence.',
        },
      ],
      dataPrompts: [
        'Spécialités',
        'Médecins et disponibilités',
        'Horaires',
        'Tarifs indicatifs',
        'Consignes et urgences',
      ],
      keywords: [
        'clinique',
        'cabinet',
        'hopital',
        'hôpital',
        'medecin',
        'médecin',
        'consultation',
        'sante',
        'santé',
      ],
    ),
    SmartSectorTemplate(
      id: 'wellness',
      label: 'Bien-être / Spa / Beauté',
      emoji: '🧘',
      description:
          'Prestations, soins, disponibilité, réservation et conseils.',
      personaName: 'Lina',
      tone: 'apaisant, élégant, bienveillant et commercial',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quels soins proposez-vous ?',
          'a': 'Je peux vous orienter selon vos besoins et votre budget.',
        },
      ],
      dataPrompts: [
        'Soins et prestations',
        'Durée des séances',
        'Tarifs',
        'Contre-indications',
        'Créneaux disponibles',
      ],
      keywords: [
        'spa',
        'bien etre',
        'bien-être',
        'beaute',
        'beauté',
        'massage',
        'coiffure',
        'salon',
        'fitness',
        'gym',
      ],
    ),
    SmartSectorTemplate(
      id: 'education',
      label: 'École / Université / Formation',
      emoji: '🎓',
      description: 'Inscriptions, programmes, niveaux, calendrier et frais.',
      personaName: 'Nadia',
      tone: 'pédagogue, clair, patient et encourageant',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Comment m’inscrire ?',
          'a':
              'Je vous indique les pièces, les étapes et les dates à respecter.',
        },
      ],
      dataPrompts: [
        'Programmes et filières',
        'Conditions d’admission',
        'Frais',
        'Calendrier',
        'Pièces à fournir',
      ],
      keywords: [
        'ecole',
        'école',
        'universite',
        'université',
        'formation',
        'cours',
        'etudiant',
        'étudiant',
        'inscription',
        'academie',
      ],
    ),
    SmartSectorTemplate(
      id: 'administration',
      label: 'Administration / Service public',
      emoji: '🏛️',
      description: 'Procédures, formulaires, pièces, délais et orientation.',
      personaName: 'Sira',
      tone: 'institutionnel, simple, neutre et méthodique',
      capabilities: {
        'qa': true,
        'sell': false,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quelles pièces faut-il fournir ?',
          'a':
              'Je vérifie la procédure concernée et vous donne la liste exacte.',
        },
      ],
      dataPrompts: [
        'Procédures',
        'Pièces requises',
        'Délais',
        'Frais officiels',
        'Contacts et guichets',
      ],
      keywords: [
        'administration',
        'mairie',
        'ministere',
        'ministère',
        'service public',
        'commune',
        'document',
        'procedure',
        'procédure',
      ],
    ),
    SmartSectorTemplate(
      id: 'hotel',
      label: 'Hôtel / Hébergement',
      emoji: '🏨',
      description: 'Chambres, tarifs, disponibilités, réservation et services.',
      personaName: 'Grâce',
      tone: 'hospitalier, élégant, précis et multilingue',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Avez-vous une chambre disponible ?',
          'a':
              'Indiquez les dates, le nombre de personnes et le type de chambre.',
        },
      ],
      dataPrompts: [
        'Types de chambres',
        'Tarifs',
        'Disponibilités',
        'Check-in et check-out',
        'Services inclus',
      ],
      keywords: [
        'hotel',
        'hôtel',
        'hebergement',
        'hébergement',
        'chambre',
        'residence',
        'résidence',
        'auberge',
      ],
    ),
    SmartSectorTemplate(
      id: 'travel',
      label: 'Voyage / Tourisme',
      emoji: '✈️',
      description: 'Destinations, circuits, devis, réservation et assistance.',
      personaName: 'Maya',
      tone: 'inspirant, organisé, réactif et commercial',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Pouvez-vous préparer un devis ?',
          'a':
              'Oui. Donnez la destination, les dates, le nombre de voyageurs et le budget.',
        },
      ],
      dataPrompts: [
        'Destinations',
        'Circuits et forfaits',
        'Documents de voyage',
        'Budget',
        'Conditions d’annulation',
      ],
      keywords: [
        'voyage',
        'tourisme',
        'agence voyage',
        'visa',
        'billet',
        'circuit',
        'excursion',
        'destination',
      ],
    ),
    SmartSectorTemplate(
      id: 'real_estate',
      label: 'Immobilier',
      emoji: '🏠',
      description:
          'Biens, critères, visites, location, vente et qualification.',
      personaName: 'Sarah',
      tone: 'conseiller, professionnel, réactif et transparent',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quels biens avez-vous ?',
          'a':
              'Précisez la zone, le budget, le type de bien et le nombre de pièces.',
        },
      ],
      dataPrompts: [
        'Biens disponibles',
        'Prix et commissions',
        'Quartiers',
        'Critères du prospect',
        'Planification des visites',
      ],
      keywords: [
        'immobilier',
        'maison',
        'appartement',
        'terrain',
        'location',
        'vente',
        'agence immobiliere',
        'agence immobilière',
      ],
    ),
    SmartSectorTemplate(
      id: 'insurance_finance',
      label: 'Banque / Assurance / Finance',
      emoji: '🏦',
      description: 'Produits, éligibilité, simulation, dossier et rendez-vous.',
      personaName: 'Éric',
      tone: 'rigoureux, rassurant, transparent et confidentiel',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quel produit me convient ?',
          'a': 'Je vous pose quelques questions avant de vous orienter.',
        },
      ],
      dataPrompts: [
        'Produits financiers',
        'Conditions d’éligibilité',
        'Documents requis',
        'Tarifs et exclusions',
        'Prise de rendez-vous',
      ],
      keywords: [
        'banque',
        'assurance',
        'finance',
        'credit',
        'crédit',
        'epargne',
        'épargne',
        'pret',
        'prêt',
      ],
    ),
    SmartSectorTemplate(
      id: 'transport',
      label: 'Transport / Logistique',
      emoji: '🚚',
      description: 'Trajets, expéditions, tarifs, suivi et délais.',
      personaName: 'Junior',
      tone: 'opérationnel, rapide, précis et orienté solution',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Combien coûte la livraison ?',
          'a':
              'Indiquez le départ, la destination, le poids et le délai souhaité.',
        },
      ],
      dataPrompts: [
        'Zones desservies',
        'Tarifs',
        'Délais',
        'Suivi des colis',
        'Types de marchandises',
      ],
      keywords: [
        'transport',
        'logistique',
        'livraison',
        'colis',
        'expedition',
        'expédition',
        'taxi',
        'fret',
      ],
    ),
    SmartSectorTemplate(
      id: 'agriculture',
      label: 'Agriculture / Agroalimentaire',
      emoji: '🌱',
      description: 'Produits, récoltes, intrants, disponibilité et commandes.',
      personaName: 'Awa',
      tone: 'pratique, accessible, fiable et orienté terrain',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Quels produits sont disponibles ?',
          'a':
              'Je vérifie la récolte, la quantité et le conditionnement disponibles.',
        },
      ],
      dataPrompts: [
        'Produits et récoltes',
        'Quantités',
        'Saisonnalité',
        'Conditionnement',
        'Livraison',
      ],
      keywords: [
        'agriculture',
        'agro',
        'ferme',
        'elevage',
        'élevage',
        'semence',
        'recolte',
        'récolte',
      ],
    ),
    SmartSectorTemplate(
      id: 'services',
      label: 'Services professionnels',
      emoji: '💼',
      description: 'Prestations, devis, qualification et prise de rendez-vous.',
      personaName: 'Alex',
      tone: 'professionnel, efficace, consultatif et concis',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Comment obtenir un devis ?',
          'a': 'Décrivez votre besoin, le délai et votre budget indicatif.',
        },
      ],
      dataPrompts: [
        'Prestations',
        'Méthode de travail',
        'Tarifs',
        'Délais',
        'Informations pour le devis',
      ],
      keywords: [
        'service',
        'consultant',
        'freelance',
        'cabinet',
        'agence',
        'expert',
        'prestation',
        'devis',
      ],
    ),
    SmartSectorTemplate(
      id: 'events',
      label: 'Événementiel',
      emoji: '🎉',
      description: 'Offres, capacité, devis, réservation et coordination.',
      personaName: 'Joy',
      tone: 'créatif, enthousiaste, organisé et professionnel',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Pouvez-vous organiser mon événement ?',
          'a':
              'Indiquez le type, la date, le lieu, le nombre d’invités et le budget.',
        },
      ],
      dataPrompts: [
        'Types d’événements',
        'Formules',
        'Capacité',
        'Prestataires',
        'Budget et date',
      ],
      keywords: [
        'evenement',
        'événement',
        'mariage',
        'conference',
        'conférence',
        'decoration',
        'décoration',
        'sonorisation',
      ],
    ),
    SmartSectorTemplate(
      id: 'ngo',
      label: 'ONG / Association',
      emoji: '🤝',
      description: 'Programmes, bénéficiaires, adhésion, dons et orientation.',
      personaName: 'Espoir',
      tone: 'humain, inclusif, clair et responsable',
      capabilities: {
        'qa': true,
        'sell': false,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Comment bénéficier du programme ?',
          'a': 'Je vérifie les critères, la zone et les étapes d’inscription.',
        },
      ],
      dataPrompts: [
        'Programmes',
        'Critères',
        'Zones d’intervention',
        'Inscription',
        'Dons et bénévolat',
      ],
      keywords: [
        'ong',
        'association',
        'fondation',
        'humanitaire',
        'projet social',
        'beneficiaire',
        'bénéficiaire',
      ],
    ),
    SmartSectorTemplate(
      id: 'technology',
      label: 'Technologie / Support',
      emoji: '💻',
      description: 'Produits numériques, support, diagnostic et escalade.',
      personaName: 'Nova',
      tone: 'technique, simple, méthodique et orienté résolution',
      capabilities: {
        'qa': true,
        'sell': true,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'J’ai un problème technique.',
          'a':
              'Décrivez le message d’erreur, l’appareil et les étapes déjà essayées.',
        },
      ],
      dataPrompts: [
        'Produits et versions',
        'Guides',
        'Incidents fréquents',
        'Diagnostic',
        'Escalade humaine',
      ],
      keywords: [
        'technologie',
        'tech',
        'logiciel',
        'application',
        'informatique',
        'support',
        'digital',
        'saas',
      ],
    ),
    SmartSectorTemplate(
      id: 'legal',
      label: 'Juridique / Conseil',
      emoji: '⚖️',
      description:
          'Informations générales, dossiers, rendez-vous et orientation.',
      personaName: 'Maître IA',
      tone: 'précis, prudent, factuel et confidentiel',
      capabilities: {
        'qa': true,
        'sell': false,
        'appointments': true,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [
        {
          'q': 'Pouvez-vous étudier mon dossier ?',
          'a':
              'Je collecte les faits essentiels avant de proposer un rendez-vous.',
        },
      ],
      dataPrompts: [
        'Domaines de droit',
        'Documents du dossier',
        'Délais',
        'Tarifs',
        'Limites du conseil automatisé',
      ],
      keywords: [
        'juridique',
        'avocat',
        'droit',
        'notaire',
        'justice',
        'contrat',
        'conseil legal',
        'conseil légal',
      ],
    ),
    SmartSectorTemplate(
      id: 'other',
      label: 'Autre activité',
      emoji: '✨',
      description: 'Template universel personnalisable automatiquement.',
      personaName: 'Assistant',
      tone: 'professionnel, chaleureux, clair et utile',
      capabilities: {
        'qa': true,
        'sell': false,
        'appointments': false,
        'qualify': true,
        'handoff': true,
      },
      starterFaq: [],
      dataPrompts: [
        'Services ou produits',
        'Public cible',
        'Horaires',
        'Tarifs',
        'Contacts et règles',
      ],
      keywords: [],
    ),
  ];

  static SmartAgentSourceDefinition source(
    SmartAgentSourceKind kind,
  ) {
    return sources.firstWhere((item) => item.kind == kind);
  }

  static SmartSectorTemplate sector(String id) {
    return sectors.firstWhere(
      (item) => item.id == id,
      orElse: () => sectors.last,
    );
  }

  static SmartTemplateRecommendation recommend({
    required String activity,
    required String description,
    required SmartAgentSourceKind sourceKind,
  }) {
    final normalized = _normalize('$activity $description');
    SmartSectorTemplate best = sectors.last;
    var bestScore = 0;

    for (final template in sectors.where((item) => item.id != 'other')) {
      var score = 0;
      for (final keyword in template.keywords) {
        final normalizedKeyword = _normalize(keyword);
        if (normalizedKeyword.isNotEmpty &&
            normalized.contains(normalizedKeyword)) {
          score += normalizedKeyword.contains(' ') ? 5 : 3;
        }
      }

      if (sourceKind == SmartAgentSourceKind.catalog &&
          template.capabilities['sell'] == true) {
        score += 2;
      }
      if (sourceKind == SmartAgentSourceKind.documents &&
          <String>[
            'administration',
            'education',
            'clinic',
            'legal',
            'ngo',
          ].contains(template.id)) {
        score += 1;
      }
      if (sourceKind == SmartAgentSourceKind.website &&
          <String>[
            'hotel',
            'travel',
            'real_estate',
            'technology',
            'services',
          ].contains(template.id)) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = template;
      }
    }

    final confidence = bestScore == 0
        ? 0.35
        : (0.48 + bestScore * 0.07).clamp(0.48, 0.96).toDouble();

    final reason = bestScore == 0
        ? 'Template universel proposé. Vous pouvez choisir un autre secteur.'
        : 'Secteur détecté à partir du nom, de la description et du type de données.';

    return SmartTemplateRecommendation(
      template: best,
      confidence: confidence,
      reason: reason,
    );
  }

  static String _normalize(String value) {
    var output = value.toLowerCase();
    const accents = <String, String>{
      'à': 'a',
      'á': 'a',
      'â': 'a',
      'ä': 'a',
      'ã': 'a',
      'ç': 'c',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'ö': 'o',
      'õ': 'o',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'ÿ': 'y',
      'œ': 'oe',
    };
    accents.forEach((key, replacement) {
      output = output.replaceAll(key, replacement);
    });
    return output
        .replaceAll(RegExp(r'[^a-z0-9 ]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}
