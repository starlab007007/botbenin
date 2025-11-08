import { CompleteModuleData } from '@/types/module';

export const iaProspectModule: CompleteModuleData = {
  id: 'ia-prospect',
  icon: '🎯',
  title: 'IA Prospect & Rapport Pre-Call',
  category: 'IA',
  badge: 'Premium',
  
  presentation: {
    shortDescription: 'IA qui recherche, qualifie et génère des rapports détaillés sur vos prospects avant chaque appel commercial.',
    fullDescription: [
      'IA Prospect est votre assistant de recherche commercial qui transforme un simple nom d\'entreprise en rapport d\'intelligence commerciale complet. En quelques secondes, l\'IA scanne le web, réseaux sociaux, bases de données publiques, et génère un dossier prospect ultra-détaillé.',
      'Chaque rapport Pre-Call contient : présentation entreprise, organigramme décisionnaires, actualités récentes, analyse SWOT, signaux d\'achat détectés, points de douleur identifiés, angle d\'approche recommandé. Vos commerciaux arrivent en RDV avec toutes les infos, comme s\'ils avaient passé 2h à faire des recherches.',
      'Augmentez votre taux de closing de +150% grâce à une préparation commerciale d\'expert en 30 secondes. Parfait pour ventes B2B complexes où la personnalisation fait la différence entre "pas intéressé" et "parlons-en".'
    ],
    videoUrl: '/videos/ia-prospect-demo.mp4',
    screenshots: [
      '/images/ia-prospect-search.png',
      '/images/ia-prospect-report.png',
      '/images/ia-prospect-signals.png',
      '/images/ia-prospect-pitch.png'
    ]
  },
  
  features: [
    {
      name: 'Recherche Entreprise Automatique',
      description: 'Donnez le nom d\'une entreprise, l\'IA trouve : site web, LinkedIn, secteur, taille, CA, localisation, filiales.',
      advantage: 'Gain de temps -95% vs recherche manuelle',
      howToUse: [
        'Entrez le nom de l\'entreprise',
        'Cliquez "Rechercher"',
        'Rapport généré en <30 secondes'
      ]
    },
    {
      name: 'Identification des Décisionnaires',
      description: 'L\'IA identifie automatiquement PDG, directeurs, responsables des départements pertinents avec LinkedIn et email.',
      advantage: 'Contactez directement les bonnes personnes',
      howToUse: [
        'Section "Organigramme" du rapport',
        'Liste des décisionnaires avec rôles et contacts',
        'Cliquez pour voir profil LinkedIn complet'
      ]
    },
    {
      name: 'Signaux d\'Achat (Buying Signals)',
      description: 'L\'IA détecte les signaux indiquant que l\'entreprise est prête à acheter : recrutements, levées de fonds, expansion, projets annoncés.',
      advantage: 'Timing parfait, conversions +200%',
      howToUse: [
        'Section "Signaux Détectés" du rapport',
        'Chaque signal avec source et date',
        'Priorité : chaud 🔥, tiède ⚡, froid ❄️'
      ]
    },
    {
      name: 'Analyse SWOT Automatique',
      description: 'Forces, Faiblesses, Opportunités, Menaces de l\'entreprise analysées automatiquement depuis données publiques.',
      advantage: 'Compréhension profonde du contexte business',
      howToUse: [
        'Section "Analyse SWOT"',
        'Utilisez les faiblesses pour pitcher vos solutions',
        'Surfez sur les opportunités détectées'
      ]
    },
    {
      name: 'Actualités & Monitoring',
      description: 'Les 10 dernières actualités de l\'entreprise agrégées et résumées : presse, réseaux sociaux, communiqués.',
      advantage: 'Toujours à jour, crédibilité maximale',
      howToUse: [
        'Section "Actualités"',
        'Mentionnez une actu récente en intro d\'appel',
        'Monitoring continu, alertes si nouveauté'
      ]
    },
    {
      name: 'Points de Douleur Identifiés',
      description: 'L\'IA identifie les problèmes business probables de l\'entreprise selon son secteur, taille, et contexte.',
      advantage: 'Pitchez des solutions, pas des produits',
      howToUse: [
        'Section "Pain Points"',
        'Préparez votre argumentaire sur ces points',
        'Posez des questions de découverte ciblées'
      ]
    },
    {
      name: 'Script d\'Approche Personnalisé',
      description: 'L\'IA génère un script d\'appel personnalisé avec accroche, questions de découverte, objections prévisibles et réponses.',
      advantage: 'Commerciaux juniors performent comme des seniors',
      howToUse: [
        'Section "Script Recommandé"',
        'Suivez le script ou personnalisez',
        'Disponible en PDF pour appel'
      ]
    },
    {
      name: 'Concurrents Identifiés',
      description: 'Liste des concurrents directs de votre prospect, avec analyse de leurs solutions et positionnement.',
      advantage: 'Anticipez les objections "on travaille avec X"',
      howToUse: [
        'Section "Écosystème Concurrentiel"',
        'Préparez arguments de différenciation',
        'Connaissez les forces/faiblesses des concurrents'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Commercial entre Nom Entreprise] --> B[IA Recherche Web]
    B --> C[Scraping Site + LinkedIn + Presse]
    C --> D[Extraction Données]
    D --> E[Analyse IA GPT-4]
    E --> F[Identification Décisionnaires]
    E --> G[Détection Signaux Achat]
    E --> H[Analyse SWOT]
    E --> I[Génération Script Pitch]
    F --> J[Génération Rapport PDF]
    G --> J
    H --> J
    I --> J
    J --> K[Commercial télécharge Rapport]
    K --> L[Appel Prospect Ultra-Préparé]
    L --> M[Taux Closing +150%]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Recherche Automatisée',
        description: 'L\'IA scanne internet (site, LinkedIn, presse, bases de données) pour collecter toutes les infos sur l\'entreprise'
      },
      {
        step: 2,
        title: 'Analyse Intelligente',
        description: 'GPT-4 analyse les données, identifie décisionnaires, signaux d\'achat, SWOT, et pain points'
      },
      {
        step: 3,
        title: 'Génération Rapport',
        description: 'Création d\'un rapport PDF professionnel de 5-8 pages avec toutes les insights'
      },
      {
        step: 4,
        title: 'Appel Commercial',
        description: 'Le commercial appelle avec toutes les infos, personnalise son pitch, et ferme'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Compte Bot.bj pack Professionnel minimum',
      'Nom de l\'entreprise prospect',
      'Module CRM Prospects activé (recommandé)'
    ],
    estimatedTime: '2 minutes',
    steps: [
      {
        number: 1,
        title: 'Accéder à IA Prospect',
        duration: '10 secondes',
        actions: [
          'Menu "IA" → "IA Prospect"',
          'Ou depuis une fiche prospect CRM : bouton "Générer Rapport Pre-Call"'
        ],
        screenshot: '/images/steps/ia-prospect-step1.png',
        expectedResult: 'Interface de recherche IA Prospect',
        commonErrors: []
      },
      {
        number: 2,
        title: 'Entrer Informations Prospect',
        duration: '20 secondes',
        actions: [
          'Entrez le nom de l\'entreprise (ou collez l\'URL du site)',
          'Ajoutez le pays (si ambigu)',
          'Optionnel : Secteur d\'activité pour affiner',
          'Cliquez "Générer Rapport"'
        ],
        screenshot: '/images/steps/ia-prospect-step2.png',
        expectedResult: 'L\'IA commence la recherche, barre de progression affichée',
        commonErrors: [
          {
            error: 'Entreprise non trouvée',
            solution: 'Vérifiez l\'orthographe, ajoutez le pays, ou collez l\'URL du site directement'
          }
        ]
      },
      {
        number: 3,
        title: 'Attendre Génération (30 secondes)',
        duration: '30 secondes',
        actions: [
          'L\'IA effectue la recherche multi-sources',
          'Visualisez les étapes en temps réel : Site web ✓ → LinkedIn ✓ → Actualités ✓ → Analyse ✓',
          'Patience, l\'IA travaille !'
        ],
        screenshot: '/images/steps/ia-prospect-step3.png',
        expectedResult: 'Rapport généré et affiché à l\'écran',
        commonErrors: []
      },
      {
        number: 4,
        title: 'Consulter le Rapport',
        duration: '3 minutes',
        actions: [
          'Lisez la section "Présentation Entreprise"',
          'Consultez "Décisionnaires" et notez les noms/rôles',
          'Analysez les "Signaux d\'Achat" 🔥',
          'Lisez les "Pain Points Identifiés"',
          'Parcourez le "Script d\'Approche Recommandé"'
        ],
        screenshot: '/images/steps/ia-prospect-step4.png',
        expectedResult: 'Vous avez une vision complète de l\'entreprise et comment l\'approcher',
        commonErrors: []
      },
      {
        number: 5,
        title: 'Télécharger ou Partager',
        duration: '10 secondes',
        actions: [
          'Cliquez "Télécharger PDF" pour avoir le rapport hors ligne',
          'Ou "Partager" pour envoyer à un collègue',
          'Le rapport est automatiquement sauvegardé dans la fiche prospect CRM'
        ],
        screenshot: '/images/steps/ia-prospect-step5.png',
        expectedResult: 'PDF téléchargé, prêt pour l\'appel',
        commonErrors: []
      },
      {
        number: 6,
        title: 'Utiliser Pendant l\'Appel',
        duration: '15 minutes (durée appel)',
        actions: [
          'Ouvrez le PDF sur un second écran ou imprimez-le',
          'Commencez l\'appel avec l\'accroche recommandée',
          'Mentionnez une actualité récente pour établir la crédibilité',
          'Posez les questions de découverte suggérées',
          'Pitchez en vous basant sur les pain points identifiés'
        ],
        screenshot: '/images/steps/ia-prospect-step6.png',
        expectedResult: 'Appel fluide, prospect impressionné par votre préparation, RDV ou vente conclu',
        commonErrors: []
      }
    ],
    finalResult: {
      description: 'Vous avez généré un rapport d\'intelligence commerciale complet en 30 secondes, qui aurait pris 2h à compiler manuellement. Votre appel est ultra-préparé, personnalisé, et vos chances de closing sont multipliées par 2.5.',
      metrics: [
        'Temps de recherche : 30 secondes (vs 2h)',
        'Qualité des infos : 90%+ précision',
        'Taux de closing : +150%',
        'Satisfaction commerciaux : 98%'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'Vente de Logiciels B2B',
      icon: '💼',
      problem: 'Commerciaux appellent à froid sans préparation, taux de closing 3%, prospects irrités par approche générique.',
      solution: 'Avant chaque appel, génération rapport IA avec SWOT, pain points, décisionnaires. Script personnalisé.',
      result: 'Taux de closing 15% (+400%), temps de préparation -95%, satisfaction prospects +80%',
      testimonial: {
        quote: 'Mes commerciaux sont devenus des consultants experts en 30 secondes. Game changer !',
        author: 'Franck L.',
        company: 'SaaS Solutions Afrique'
      }
    },
    {
      sector: 'Agence de Services',
      icon: '🎨',
      problem: 'Prospection outbound faible ROI, propositions commerciales trop génériques, taux de réponse <2%.',
      solution: 'IA Prospect identifie signaux d\'achat (recrutements, levées de fonds). Propositions ultra-personnalisées.',
      result: 'Taux de réponse 18%, propositions acceptées +250%, CA doublé',
      testimonial: {
        quote: 'On ne prospecte que les entreprises avec signaux chauds. Notre taux de conversion a explosé.',
        author: 'Sophie N.',
        company: 'Digital Agency Pro'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Temps de recherche/prospect',
        before: '2 heures',
        after: '30 secondes',
        improvement: '-99%'
      },
      {
        metric: 'Taux de closing',
        before: '5%',
        after: '15%',
        improvement: '+200%'
      },
      {
        metric: 'Coût acquisition client',
        before: '50 000 FCFA',
        after: '15 000 FCFA',
        improvement: '-70%'
      },
      {
        metric: 'Nombre de RDV obtenus',
        before: '10/mois',
        after: '35/mois',
        improvement: '+250%'
      }
    ],
    investment: {
      monthlyPrice: 5000,
      setupTime: '0 minute',
      totalYearOne: 60000
    },
    gains: {
      labourSavings: 2400000,
      revenueIncrease: 3600000,
      totalYearOne: 6000000
    },
    roiPercentage: 9900,
    paybackPeriod: '3 jours'
  },
  
  pricing: {
    plansComparison: [
      {
        plan: 'Découverte',
        price: 0,
        included: false,
        limits: 'Non disponible'
      },
      {
        plan: 'Essentiel',
        price: 3000,
        included: false,
        limits: 'Non disponible'
      },
      {
        plan: 'Professionnel',
        price: 5000,
        included: true,
        limits: '50 rapports/mois'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Rapports illimités'
      }
    ],
    recommendation: 'Pack Professionnel minimum pour accéder à IA Prospect. Ventes recommandé pour équipes commerciales actives.'
  },
  
  faq: [
    {
      question: 'D\'où proviennent les données utilisées par l\'IA ?',
      answer: 'L\'IA agrège des données publiques : sites web d\'entreprises, LinkedIn, presse en ligne, communiqués, bases de données d\'entreprises (Crunchbase, etc.), réseaux sociaux. Aucune donnée privée ou illégalement obtenue. 100% conforme RGPD/lois sur données.'
    },
    {
      question: 'La précision des informations est-elle garantie ?',
      answer: 'L\'IA a un taux de précision de 90%+ sur les infos factuelles (nom, secteur, taille). Pour analyses (SWOT, pain points), c\'est de l\'intelligence prédictive basée sur patterns. Toujours vérifier les infos critiques, l\'IA est un assistant pas un oracle.'
    },
    {
      question: 'Combien de temps prend la génération d\'un rapport ?',
      answer: 'Entre 20 et 60 secondes selon la complexité de l\'entreprise et la disponibilité des données. Grandes entreprises = plus rapide (plus de données publiques). PME locales = parfois plus long (moins de présence web).'
    },
    {
      question: 'Puis-je générer des rapports sur des entreprises internationales ?',
      answer: 'Oui, l\'IA fonctionne dans le monde entier. Meilleure couverture pour : USA, Europe, Afrique francophone. Données plus limitées pour certains pays avec faible présence web (ex: Corée du Nord 😄). Supporté : 150+ pays.'
    },
    {
      question: 'Les rapports sont-ils sauvegardés ?',
      answer: 'Oui, automatiquement dans le CRM Prospects si module activé. Vous pouvez aussi télécharger en PDF. Historique complet accessible : re-consultez un rapport généré il y a 6 mois. Option "Régénérer" pour mettre à jour avec données récentes.'
    },
    {
      question: 'Puis-je personnaliser les sections du rapport ?',
      answer: 'Oui, dans Paramètres IA Prospect : activez/désactivez sections, ajoutez des sections custom, personnalisez les critères de "signaux d\'achat" selon votre industrie. Vous pouvez aussi ajouter notes manuelles à un rapport avant export.'
    },
    {
      question: 'L\'IA peut-elle trouver les emails des décisionnaires ?',
      answer: 'L\'IA fournit les noms et rôles des décisionnaires, avec liens LinkedIn. Pour les emails directs, intégration avec outils de prospection (Hunter.io, Apollo) disponible (service externe payant). Dans certains cas, l\'IA trouve l\'email s\'il est public.'
    },
    {
      question: 'Comment l\'IA détecte-t-elle les "signaux d\'achat" ?',
      answer: 'L\'IA surveille : recrutements (ex: "cherche un CTO" = projet tech), levées de fonds (cash dispo), expansion géographique (besoins infra), changements leadership (opportunité de switch fournisseur), actualités mentionnant problèmes résolus par vos solutions.'
    },
    {
      question: 'Puis-je utiliser IA Prospect pour de la prospection de masse ?',
      answer: 'Oui, fonction "Import Liste" : uploadez CSV avec noms d\'entreprises, l\'IA génère tous les rapports en arrière-plan (traitement batch). Vous recevez une notification quand tous les rapports sont prêts. Idéal pour campagnes ABM (Account-Based Marketing).'
    },
    {
      question: 'Les rapports sont-ils téléchargeables pour les présenter hors ligne ?',
      answer: 'Oui, export PDF professionnel avec logo Bot.bj (ou votre logo en white-label sur pack Entreprise). PDF formaté pour impression ou lecture sur tablette pendant appels. Vous pouvez aussi partager le lien web du rapport.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation IA Prospect 15 pages',
      format: 'PDF',
      size: '2.2 MB',
      url: '/downloads/ia-prospect-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Masterclass IA Prospect (25 min)',
      format: 'MP4',
      size: '80 MB',
      url: '/videos/ia-prospect-tutorial.mp4'
    },
    {
      type: 'Exemple Rapport',
      description: 'Exemple de rapport généré',
      format: 'PDF',
      size: '1.5 MB',
      url: '/downloads/ia-prospect-sample-report.pdf'
    },
    {
      type: 'Scripts Commerciaux',
      description: 'Pack de scripts pour différents secteurs',
      format: 'PDF',
      size: '3 MB',
      url: '/downloads/ia-prospect-scripts.pdf'
    }
  ],
  
  metadata: {
    difficulty: 'débutant',
    estimatedSetupTime: '0 minute',
    minimumPlan: 'Professionnel (5 000 FCFA/mois)',
    integrations: ['CRM Prospects', 'LinkedIn', 'Hunter.io', 'Apollo', 'Lusha'],
    tags: ['IA', 'prospection', 'intelligence', 'commercial', 'B2B', 'recherche', 'closing']
  }
};
