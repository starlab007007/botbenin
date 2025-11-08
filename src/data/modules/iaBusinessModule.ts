import { CompleteModuleData } from '@/types/module';

export const iaBusinessModule: CompleteModuleData = {
  id: 'ia-business',
  icon: '💼',
  title: 'IA Business – Agent B2B',
  category: 'IA',
  badge: 'Pro',
  
  presentation: {
    shortDescription: 'Agent IA spécialisé pour les entreprises, générant des leads qualifiés et automatisant la prospection B2B.',
    fullDescription: [
      'IA Business est votre directeur commercial digital qui travaille 24/7 pour générer des opportunités d\'affaires. Spécialement conçu pour le B2B, cet agent intelligent qualifie les prospects, répond aux demandes professionnelles et maintient votre pipeline commercial plein.',
      'Grâce à l\'analyse comportementale avancée et l\'apprentissage continu, IA Business comprend les besoins spécifiques des entreprises, adapte son discours au secteur d\'activité et maximise vos taux de conversion. Il intègre vos processus de vente existants et synchronise avec votre CRM.',
      'Avec IA Business, augmentez votre génération de leads de +200%, réduisez votre cycle de vente de -40% et libérez vos équipes commerciales pour qu\'elles se concentrent sur la conclusion des ventes.'
    ],
    videoUrl: '/videos/ia-business-demo.mp4',
    screenshots: [
      '/images/ia-business-dashboard.png',
      '/images/ia-business-leads.png',
      '/images/ia-business-analytics.png',
      '/images/ia-business-crm.png'
    ]
  },
  
  features: [
    {
      name: 'Qualification Automatique des Leads',
      description: 'Évalue automatiquement chaque prospect selon vos critères (budget, besoin, timing, autorité) et assigne un score de qualité.',
      advantage: 'Vos commerciaux ne traitent que les prospects chauds, +80% efficacité',
      howToUse: [
        'Définissez vos critères de qualification',
        'IA Business évalue chaque interaction',
        'Leads qualifiés envoyés automatiquement au CRM'
      ]
    },
    {
      name: 'Génération de Propositions Commerciales',
      description: 'Crée des propositions personnalisées basées sur les besoins détectés, incluant tarifs, délais et bénéfices.',
      advantage: 'Réponses instantanées aux demandes de devis, +60% taux de réponse',
      howToUse: [
        'Configurez vos templates de propositions',
        'IA Business adapte selon le contexte',
        'Envoi automatique par email avec suivi'
      ]
    },
    {
      name: 'Relances Intelligentes',
      description: 'Système de relance multi-canal (email, WhatsApp, SMS) avec timing optimisé par l\'IA pour maximiser les réponses.',
      advantage: 'Ne perdez plus aucune opportunité, +50% taux de conversion',
      howToUse: [
        'Activez les relances automatiques',
        'L\'IA détermine le meilleur moment',
        'Séquences personnalisées par prospect'
      ]
    },
    {
      name: 'Analyse de Secteur',
      description: 'IA Business analyse le secteur d\'activité du prospect et adapte son vocabulaire et arguments de vente.',
      advantage: 'Discours parfaitement ciblé, crédibilité maximale',
      howToUse: [
        'L\'IA détecte automatiquement le secteur',
        'Arguments adaptés en temps réel',
        'Cas clients sectoriels mentionnés'
      ]
    },
    {
      name: 'Intégration CRM Bidirectionnelle',
      description: 'Synchronisation temps réel avec Salesforce, HubSpot, Pipedrive et 50+ CRM pour un workflow fluide.',
      advantage: 'Données toujours à jour, 0 ressaisie manuelle',
      howToUse: [
        'Connectez votre CRM en 1 clic',
        'Mapping automatique des champs',
        'Sync bidirectionnelle instantanée'
      ]
    },
    {
      name: 'Prise de Rendez-vous Automatique',
      description: 'IA Business consulte vos calendriers et propose des créneaux directement au prospect, confirmations automatiques.',
      advantage: 'Agenda commercial rempli sans effort, -90% no-shows',
      howToUse: [
        'Connectez Google/Outlook Calendar',
        'Définissez vos disponibilités',
        'IA Business gère tout'
      ]
    },
    {
      name: 'Reporting Avancé',
      description: 'Tableaux de bord détaillés : sources de leads, taux de conversion par secteur, ROI campagnes, prévisions.',
      advantage: 'Décisions data-driven, optimisation continue',
      howToUse: [
        'Accédez au Dashboard Analytics',
        'Explorez les métriques clés',
        'Exportez les rapports pour direction'
      ]
    },
    {
      name: 'Conversations Multi-Étapes',
      description: 'Maintient des conversations complexes sur plusieurs jours, se souvient du contexte et fait progresser le prospect.',
      advantage: 'Nurturing automatique, maturation accélérée',
      howToUse: [
        'Définissez votre funnel de vente',
        'IA Business guide le prospect',
        'Alertes quand ready to buy'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Lead arrive] --> B[Qualification automatique]
    B --> C{Score qualité}
    C -->|Élevé| D[Proposition personnalisée]
    C -->|Moyen| E[Nurturing séquence]
    C -->|Faible| F[Liste attente]
    D --> G[Envoi proposition]
    G --> H[Suivi automatique]
    E --> H
    H --> I{Réponse prospect}
    I -->|Intéressé| J[Prise RDV auto]
    I -->|Questions| K[Réponses IA]
    I -->|Pas de réponse| L[Relance intelligente]
    J --> M[Sync CRM + Alert commercial]
    K --> H
    L --> H`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Arrivée du Lead',
        description: 'Un prospect B2B entre en contact (formulaire, chat, email, appel)'
      },
      {
        step: 2,
        title: 'Qualification Automatique',
        description: 'IA Business pose les questions qualifiantes et évalue le potentiel'
      },
      {
        step: 3,
        title: 'Scoring',
        description: 'Attribution d\'un score de qualité basé sur vos critères'
      },
      {
        step: 4,
        title: 'Routage Intelligent',
        description: 'Lead dispatché selon son score : vente immédiate, nurturing ou liste attente'
      },
      {
        step: 5,
        title: 'Proposition Personnalisée',
        description: 'Génération automatique d\'une offre adaptée au besoin détecté'
      },
      {
        step: 6,
        title: 'Suivi Automatisé',
        description: 'Relances programmées avec timing optimisé par l\'IA'
      },
      {
        step: 7,
        title: 'Traitement des Réponses',
        description: 'IA Business gère questions, objections et signaux d\'achat'
      },
      {
        step: 8,
        title: 'Prise de Rendez-vous',
        description: 'Quand le prospect est chaud, RDV automatique avec votre équipe'
      },
      {
        step: 9,
        title: 'Synchronisation CRM',
        description: 'Toutes les données sont pushées dans votre CRM en temps réel'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Compte Bot.bj pack Professionnel minimum',
      'Base de connaissances produits/services',
      'Grille de tarification',
      'CRM configuré (optionnel mais recommandé)'
    ],
    estimatedTime: '15 minutes',
    steps: [
      {
        number: 1,
        title: 'Activer IA Business',
        duration: '2 minutes',
        actions: [
          'Menu latéral > Modules IA > IA Business',
          'Cliquez sur "Activer le module"',
          'Sélectionnez votre secteur d\'activité'
        ],
        expectedResult: 'Module IA Business activé et prêt à configurer',
        commonErrors: [
          {
            error: 'Module non disponible',
            solution: 'Upgradez vers pack Professionnel ou supérieur'
          }
        ]
      },
      {
        number: 2,
        title: 'Configurer les Critères de Qualification',
        duration: '5 minutes',
        actions: [
          'Onglet Qualification > Définir critères',
          'Ajoutez : budget min, secteurs cibles, taille entreprise',
          'Définissez les seuils de scoring (chaud/tiède/froid)',
          'Enregistrez'
        ],
        expectedResult: 'Grille de qualification active',
        commonErrors: []
      },
      {
        number: 3,
        title: 'Uploader Base de Connaissances',
        duration: '3 minutes',
        actions: [
          'Onglet Connaissances > Ajouter documents',
          'Uploadez : catalogue produits, grille tarifaire, études de cas',
          'L\'IA indexe automatiquement (1-2 minutes)',
          'Vérifiez le statut "Indexé"'
        ],
        expectedResult: 'Base de connaissances prête, IA peut répondre sur vos offres',
        commonErrors: []
      },
      {
        number: 4,
        title: 'Créer Templates de Propositions',
        duration: '3 minutes',
        actions: [
          'Onglet Propositions > Nouveau template',
          'Rédigez structure : intro, offre, tarifs, CTA',
          'Utilisez variables dynamiques {nom_entreprise}, {budget}, etc.',
          'Sauvegardez le template'
        ],
        expectedResult: 'Template prêt pour génération automatique',
        commonErrors: []
      },
      {
        number: 5,
        title: 'Connecter votre CRM (Optionnel)',
        duration: '2 minutes',
        actions: [
          'Onglet Intégrations > Sélectionnez votre CRM',
          'Cliquez "Connecter" et autorisez l\'accès',
          'Mappez les champs (lead, contact, opportunité)',
          'Testez la synchronisation'
        ],
        expectedResult: 'CRM connecté, sync bidirectionnelle active',
        commonErrors: [
          {
            error: 'Échec de connexion',
            solution: 'Vérifiez vos droits admin sur le CRM et réessayez'
          }
        ]
      },
      {
        number: 6,
        title: 'Lancer la Première Campagne',
        duration: '1 minute',
        actions: [
          'Retour Dashboard > "Nouvelle campagne"',
          'Nommez votre campagne, sélectionnez canaux',
          'Cliquez "Lancer"',
          'IA Business est maintenant actif !'
        ],
        expectedResult: 'Campagne active, IA commence à qualifier les leads entrants',
        commonErrors: []
      }
    ],
    finalResult: {
      description: 'IA Business est opérationnel ! Il qualifie désormais automatiquement vos leads, génère des propositions personnalisées et remplit votre pipeline commercial.',
      metrics: [
        'Temps de réponse : <30 secondes',
        'Taux de qualification : +85%',
        'Propositions générées : illimitées',
        'ROI moyen : +350% en 3 mois'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'SaaS & Logiciels',
      icon: '💻',
      problem: 'Trop de leads inbound mais équipe commerciale petite, 60% des prospects non traités, opportunités perdues.',
      solution: 'IA Business qualifie 100% des leads, répond aux questions techniques, organise démos avec les prospects chauds.',
      result: '+250% leads traités, +120% démos schedulées, -50% coût d\'acquisition client',
      testimonial: {
        quote: 'IA Business gère notre prospection inbound. Notre équipe se concentre sur closer les deals !',
        author: 'David Mensah',
        company: 'CloudTech Solutions'
      }
    },
    {
      sector: 'Services B2B',
      icon: '🤝',
      problem: 'Prospection chronophage, taux de réponse email <5%, difficile de décrocher les décideurs.',
      solution: 'IA Business contacte les prospects multi-canal, adapte le message au secteur, relance au bon moment.',
      result: '+40% taux de réponse, +80% RDV obtenus, cycle de vente réduit de 15 à 8 jours',
      testimonial: {
        quote: 'Notre pipeline s\'est rempli en 2 semaines. IA Business est notre meilleur commercial.',
        author: 'Sophie Martin',
        company: 'Conseil & Stratégie'
      }
    },
    {
      sector: 'Industriel & Manufacturing',
      icon: '🏭',
      problem: 'Devis complexes, demandes nécessitant specs techniques, délai de réponse 3-5 jours.',
      solution: 'IA Business collecte specs, génère devis préliminaires basés sur tarifs configurés, planning automatique.',
      result: 'Réponse en <2h vs 3 jours, +90% satisfaction prospects, +35% taux de transformation',
      testimonial: {
        quote: 'Nos prospects reçoivent un devis détaillé en moins d\'une heure. Révolutionnaire.',
        author: 'Ibrahim Traoré',
        company: 'MetalWorks Industries'
      }
    },
    {
      sector: 'Import-Export & Commerce',
      icon: '🌍',
      problem: 'Clients internationaux dans différents fuseaux, impossible de répondre 24/7, pertes de contrats.',
      solution: 'IA Business multilingue disponible 24/7, gère les demandes de catalogues, négocie prix selon volumes.',
      result: '+70% demandes traitées hors horaires, -0% leads perdus, expansion 15 nouveaux pays',
      testimonial: {
        quote: 'Clients en Asie, Europe, Amérique. IA Business répond à tous, dans leur langue, immédiatement.',
        author: 'Mariam Koné',
        company: 'AfricaTrade Global'
      }
    },
    {
      sector: 'Formation & Consulting',
      icon: '📚',
      problem: 'Demandes de formations sur-mesure nécessitant compréhension besoins, creation programmes personnalisés.',
      solution: 'IA Business mène l\'analyse des besoins, propose programmes adaptés, calcule devis selon modules.',
      result: '+200% propositions envoyées, +45% taux closing, satisfaction client 98%',
      testimonial: {
        quote: 'IA Business crée des programmes sur-mesure en 10 minutes. Nos clients sont impressionnés.',
        author: 'Dr. Emmanuel Boni',
        company: 'Excellence Formation'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Leads traités/mois',
        before: '50-100',
        after: '500-1000',
        improvement: '+800%'
      },
      {
        metric: 'Temps de réponse',
        before: '24-48h',
        after: '<30 secondes',
        improvement: '+99%'
      },
      {
        metric: 'Taux de conversion',
        before: '8%',
        after: '22%',
        improvement: '+175%'
      },
      {
        metric: 'Coût par lead qualifié',
        before: '15 000 FCFA',
        after: '500 FCFA',
        improvement: '-97%'
      },
      {
        metric: 'Taux de réponse prospect',
        before: '5%',
        after: '42%',
        improvement: '+740%'
      },
      {
        metric: 'Cycle de vente moyen',
        before: '45 jours',
        after: '18 jours',
        improvement: '-60%'
      }
    ],
    investment: {
      monthlyPrice: 5000,
      setupTime: '15 minutes',
      totalYearOne: 60000
    },
    gains: {
      labourSavings: 2400000,
      revenueIncrease: 5000000,
      totalYearOne: 7400000
    },
    roiPercentage: 12233,
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
        limits: '500 leads qualifiés/mois'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Illimité + fonctionnalités avancées'
      }
    ],
    recommendation: 'Pack Professionnel minimum pour activer IA Business'
  },
  
  faq: [
    {
      question: 'IA Business peut-il remplacer mes commerciaux ?',
      answer: 'Non, IA Business est un assistant qui augmente l\'efficacité de vos équipes. Il gère la qualification, le nurturing et les tâches répétitives, libérant vos commerciaux pour se concentrer sur la conclusion des ventes et la relation client stratégique.'
    },
    {
      question: 'Comment IA Business qualifie-t-il les leads ?',
      answer: 'Selon vos critères personnalisés : budget, secteur, taille entreprise, besoin, timing, autorité (BANT). Chaque interaction génère un score. Leads >80/100 = chauds, 50-80 = tièdes, <50 = froids.'
    },
    {
      question: 'Quels CRM sont supportés ?',
      answer: 'Intégration native avec Salesforce, HubSpot, Pipedrive, Zoho, Microsoft Dynamics. API Zapier pour 3000+ autres outils. Sync bidirectionnelle temps réel.'
    },
    {
      question: 'IA Business peut-il gérer des ventes complexes ?',
      answer: 'Oui ! Il maintient des conversations multi-étapes, comprend les cycles de vente longs, gère les comités d\'achat multiples. Idéal pour B2B complexe avec plusieurs décideurs.'
    },
    {
      question: 'Comment mesurer le ROI d\'IA Business ?',
      answer: 'Dashboard Analytics inclut : nombre de leads qualifiés, taux de conversion, revenus générés, temps gagné équipe, coût par acquisition. Export rapports pour direction.'
    },
    {
      question: 'Puis-je personnaliser le discours commercial ?',
      answer: 'Totalement ! Définissez le tone of voice, arguments clés, objections/réponses, cas clients à mentionner. IA Business adapte selon le contexte tout en respectant votre ligne directrice.'
    },
    {
      question: 'IA Business fonctionne sur quels canaux ?',
      answer: 'Email, WhatsApp Business, chat web, formulaires, SMS, appels téléphoniques (via intégration). Stratégie omnicanale avec messages cohérents.'
    },
    {
      question: 'Combien de temps pour voir des résultats ?',
      answer: 'Premiers leads qualifiés dès J1. ROI positif généralement à J7-J15. Pleine vitesse de croisière après 1 mois quand IA a appris vos spécificités.'
    },
    {
      question: 'IA Business peut-il négocier les prix ?',
      answer: 'Il peut proposer des fourchettes de prix, appliquer remises selon règles configurées, et orienter vers votre équipe pour négociations finales. Garde toujours contrôle humain sur pricing final.'
    },
    {
      question: 'Les conversations sont-elles sauvegardées ?',
      answer: 'Oui, toutes les interactions sont enregistrées, transcrites et analysées. Historique complet accessible dans le CRM. Export illimité. Conformité RGPD garantie.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation IA Business 25 pages',
      format: 'PDF',
      size: '3.8 MB',
      url: '/downloads/ia-business-guide.pdf'
    },
    {
      type: 'Vidéo Formation',
      description: 'Formation complète 15 minutes',
      format: 'MP4',
      size: '85 MB',
      url: '/videos/ia-business-formation.mp4'
    },
    {
      type: 'Templates',
      description: 'Pack 10 templates propositions commerciales',
      format: 'Word/PDF',
      size: '1.2 MB',
      url: '/downloads/ia-business-templates.zip'
    },
    {
      type: 'Checklist ROI',
      description: 'Calculateur ROI IA Business',
      format: 'Excel',
      size: '150 KB',
      url: '/downloads/ia-business-roi-calculator.xlsx'
    },
    {
      type: 'Guide CRM',
      description: 'Configuration intégrations CRM',
      format: 'PDF',
      size: '2 MB',
      url: '/downloads/ia-business-crm-setup.pdf'
    }
  ],
  
  metadata: {
    difficulty: 'intermédiaire',
    estimatedSetupTime: '15 minutes',
    minimumPlan: 'Professionnel',
    integrations: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zapier', 'WhatsApp', 'Email', 'SMS'],
    tags: ['b2b', 'leads', 'prospection', 'crm', 'ventes', 'automatisation']
  }
};
