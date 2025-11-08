import { CompleteModuleData } from '@/types/module';

export const prospectsModule: CompleteModuleData = {
  id: 'prospects',
  icon: '📈',
  title: 'CRM Prospects - Gestion Intelligente',
  category: 'Support',
  badge: 'Pro',
  
  presentation: {
    shortDescription: 'CRM intelligent pour capturer, qualifier, et convertir vos prospects automatiquement avec l\'IA.',
    fullDescription: [
      'Le module CRM Prospects transforme chaque interaction en opportunité commerciale. Capturez automatiquement les leads depuis tous vos canaux (site web, WhatsApp, Facebook, formulaires), qualifiez-les avec l\'IA, et suivez-les jusqu\'à la conversion dans un pipeline visuel.',
      'Fini les prospects perdus dans les emails ou sur des post-its. Centralisez tout dans une base de données unifiée avec historique complet, scoring automatique, et rappels intelligents. L\'IA enrichit chaque fiche prospect avec données publiques (LinkedIn, entreprise) et recommande les meilleures actions.',
      'Augmentez votre taux de conversion de +120% grâce au suivi automatisé, aux séquences email personnalisées, et aux alertes en temps réel. Parfait pour équipes commerciales qui veulent scaler sans perdre la touche personnelle.'
    ],
    videoUrl: '/videos/prospects-crm-demo.mp4',
    screenshots: [
      '/images/prospects-pipeline.png',
      '/images/prospects-fiche.png',
      '/images/prospects-scoring.png',
      '/images/prospects-analytics.png'
    ]
  },
  
  features: [
    {
      name: 'Capture Automatique Multi-Canal',
      description: 'Capturez les prospects depuis site web, WhatsApp, Facebook, formulaires, et CSV. Aucune saisie manuelle.',
      advantage: 'Zéro lead perdu, gain de temps -90%',
      howToUse: [
        'Connectez vos canaux dans "Intégrations"',
        'Définissez les champs à capturer',
        'Les prospects arrivent automatiquement dans le CRM'
      ]
    },
    {
      name: 'Scoring IA Automatique',
      description: 'L\'IA attribue un score de 0 à 100 à chaque prospect selon probabilité de conversion (comportement, profil, engagement).',
      advantage: 'Focus sur les leads chauds, conversions +80%',
      howToUse: [
        'Le scoring se fait automatiquement',
        'Visualisez le score sur chaque fiche',
        'Filtrez par score pour prioriser'
      ]
    },
    {
      name: 'Pipeline Visuel Drag & Drop',
      description: 'Gérez vos prospects dans un pipeline Kanban intuitif : Nouveau → Contacté → Qualifié → Proposé → Gagné/Perdu.',
      advantage: 'Clarté totale, taux de closing +40%',
      howToUse: [
        'Glissez-déposez les cartes entre colonnes',
        'Personnalisez les étapes selon votre processus',
        'Visualisez la valeur totale par étape'
      ]
    },
    {
      name: 'Enrichissement Automatique',
      description: 'L\'IA enrichit automatiquement les fiches : nom entreprise, secteur, taille, LinkedIn, site web.',
      advantage: 'Données complètes, préparation commerciale optimale',
      howToUse: [
        'Activez "Enrichissement Auto" dans paramètres',
        'L\'IA complète les infos en arrière-plan',
        'Validez ou corrigez si besoin'
      ]
    },
    {
      name: 'Séquences Email Automatisées',
      description: 'Créez des campagnes d\'emails automatisées personnalisées selon le comportement et l\'étape du prospect.',
      advantage: 'Nurturing efficace, engagement +60%',
      howToUse: [
        'Créez une séquence dans "Automatisations"',
        'Définissez les déclencheurs et délais',
        'Personnalisez les emails avec variables'
      ]
    },
    {
      name: 'Rappels & Tâches Intelligents',
      description: 'Le système suggère automatiquement les prochaines actions et crée des rappels selon le contexte.',
      advantage: 'Zéro oubli, follow-up systématique',
      howToUse: [
        'Les rappels apparaissent dans votre tableau de bord',
        'Cliquez pour marquer "fait" et logger l\'activité',
        'Configurez vos préférences de rappels'
      ]
    },
    {
      name: 'Historique Complet & Timeline',
      description: 'Visualisez toutes les interactions avec chaque prospect : emails, appels, messages, visites site, docs envoyés.',
      advantage: 'Contexte total, ventes personnalisées',
      howToUse: [
        'Ouvrez la fiche prospect',
        'Onglet "Historique"',
        'Timeline chronologique de toutes les interactions'
      ]
    },
    {
      name: 'Analytics & Prévisions',
      description: 'Tableaux de bord avec taux de conversion, durée moyenne cycle de vente, prévisions CA, top sources leads.',
      advantage: 'Décisions data-driven, prédictibilité',
      howToUse: [
        'Dashboard Analytics',
        'Filtrez par période, source, commercial',
        'Exportez les rapports'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Lead Arrive] --> B[Capture Auto Multi-Canal]
    B --> C[Enrichissement IA]
    C --> D[Scoring 0-100]
    D --> E{Score >70?}
    E -->|Oui| F[Alerte Commercial Immédiate]
    E -->|Non| G[Séquence Nurturing Auto]
    F --> H[Commercial Contacte]
    G --> I{Engagement Augmente?}
    I -->|Oui| F
    I -->|Non| J[Archivage Intelligent]
    H --> K[Pipeline: Contacté → Qualifié]
    K --> L[Proposition Envoyée]
    L --> M{Conversion?}
    M -->|Oui| N[Client! Envoi CRM Clients]
    M -->|Non| O[Analyse Perte + Apprentissage]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Capture & Enrichissement',
        description: 'Le lead arrive depuis n\'importe quel canal, est automatiquement capturé et enrichi par l\'IA'
      },
      {
        step: 2,
        title: 'Scoring & Priorisation',
        description: 'L\'IA attribue un score. Les leads chauds (>70) déclenchent une alerte immédiate'
      },
      {
        step: 3,
        title: 'Nurturing ou Contact Direct',
        description: 'Leads chauds contactés immédiatement, leads froids nurtured automatiquement jusqu\'à maturation'
      },
      {
        step: 4,
        title: 'Suivi Pipeline',
        description: 'Le commercial fait avancer le prospect dans le pipeline jusqu\'à conversion ou perte'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Compte Bot.bj (pack Essentiel minimum)',
      'Sources de leads (site web, formulaires, ou campagnes)',
      'Process de vente défini (même basique)'
    ],
    estimatedTime: '8 minutes',
    steps: [
      {
        number: 1,
        title: 'Activer le Module CRM Prospects',
        duration: '30 secondes',
        actions: [
          'Menu "CRM" → "Prospects"',
          'Cliquez "Activer le CRM Prospects"',
          'Choisissez votre devise (FCFA, EUR, USD...)'
        ],
        screenshot: '/images/steps/prospects-step1.png',
        expectedResult: 'Module activé, tableau de bord CRM visible',
        commonErrors: []
      },
      {
        number: 2,
        title: 'Configurer le Pipeline',
        duration: '2 minutes',
        actions: [
          'Onglet "Pipeline"',
          'Utilisez le pipeline par défaut (Nouveau → Contacté → Qualifié → Proposé → Gagné/Perdu)',
          'Ou cliquez "Personnaliser" pour ajouter/modifier les étapes',
          'Définissez les étapes de votre processus de vente',
          'Enregistrez'
        ],
        screenshot: '/images/steps/prospects-step2.png',
        expectedResult: 'Pipeline configuré selon votre processus commercial',
        commonErrors: []
      },
      {
        number: 3,
        title: 'Connecter les Sources de Leads',
        duration: '2 minutes',
        actions: [
          'Onglet "Sources"',
          'Activez les sources disponibles : Formulaire Web, WhatsApp, Facebook Lead Ads',
          'Pour Formulaire Web : Copiez le code embed et ajoutez-le à votre site',
          'Pour WhatsApp : Activez "Capture Automatique" dans WhatsApp Connect',
          'Testez chaque source en créant un lead test'
        ],
        screenshot: '/images/steps/prospects-step3.png',
        expectedResult: 'Sources connectées, leads de test reçus dans le CRM',
        commonErrors: [
          {
            error: 'Formulaire web ne capture pas',
            solution: 'Vérifiez que le code est bien avant </body>, et que votre site n\'a pas de bloqueur de scripts'
          }
        ]
      },
      {
        number: 4,
        title: 'Activer l\'Enrichissement IA',
        duration: '1 minute',
        actions: [
          'Paramètres CRM → Onglet "IA"',
          'Activez "Enrichissement Automatique"',
          'Activez "Scoring Automatique"',
          'Configurez les critères de scoring (optionnel, IA propose des défauts intelligents)',
          'Enregistrez'
        ],
        screenshot: '/images/steps/prospects-step4.png',
        expectedResult: 'IA activée, les prochains prospects seront enrichis et scorés automatiquement',
        commonErrors: []
      },
      {
        number: 5,
        title: 'Créer Votre Premier Prospect Manuellement',
        duration: '1 minute',
        actions: [
          'Cliquez "➕ Nouveau Prospect"',
          'Remplissez les infos minimales : Nom, Email, Téléphone (le reste sera enrichi par l\'IA)',
          'Ajoutez une note (ex: "Rencontré au salon")',
          'Sélectionnez la source',
          'Cliquez "Créer"'
        ],
        screenshot: '/images/steps/prospects-step5.png',
        expectedResult: 'Prospect créé, visible dans le pipeline à l\'étape "Nouveau"',
        commonErrors: []
      },
      {
        number: 6,
        title: 'Explorer la Fiche Prospect',
        duration: '1 minute',
        actions: [
          'Cliquez sur le prospect que vous venez de créer',
          'Consultez les onglets : Aperçu (score, infos enrichies), Historique, Tâches, Emails',
          'Notez le score IA et les données enrichies',
          'Cliquez sur "Ajouter une Note" pour logger une interaction'
        ],
        screenshot: '/images/steps/prospects-step6.png',
        expectedResult: 'Fiche complète avec données enrichies et score',
        commonErrors: []
      },
      {
        number: 7,
        title: 'Faire Avancer dans le Pipeline',
        duration: '30 secondes',
        actions: [
          'Depuis la fiche ou le pipeline board',
          'Glissez-déposez la carte vers "Contacté"',
          'Ou cliquez "Changer Étape" et sélectionnez',
          'Ajoutez une note sur l\'action faite (ex: "Appelé, RDV fixé demain")'
        ],
        screenshot: '/images/steps/prospects-step7.png',
        expectedResult: 'Prospect déplacé, historique mis à jour',
        commonErrors: []
      },
      {
        number: 8,
        title: 'Configurer une Alerte (Optionnel)',
        duration: '1 minute',
        actions: [
          'Ouvrez la fiche prospect',
          'Section "Tâches & Rappels"',
          'Cliquez "Ajouter un Rappel"',
          'Définissez la date/heure et le type (Appel, Email, RDV)',
          'Vous recevrez une notification au moment choisi'
        ],
        screenshot: '/images/steps/prospects-step8.png',
        expectedResult: 'Rappel configuré, apparaîtra dans votre agenda',
        commonErrors: []
      }
    ],
    finalResult: {
      description: 'Votre CRM Prospects est opérationnel ! Les leads arrivent automatiquement, sont enrichis et scorés par l\'IA. Vous les suivez visuellement dans le pipeline jusqu\'à la conversion. Aucun prospect ne sera plus jamais perdu.',
      metrics: [
        'Capture automatique : 100%',
        'Enrichissement IA : 80% des champs',
        'Gain de temps : -90%',
        'Taux de conversion attendu : +120%'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'SaaS / Logiciel',
      icon: '💻',
      problem: 'Leads gratuits depuis landing page nombreux mais non qualifiés. Commerciaux perdent du temps sur leads froids.',
      solution: 'CRM capte leads, IA score selon engagement (pages vues, docs téléchargés), alerte commerciaux pour scores >80.',
      result: 'Taux de conversion x3, temps commercial gagné 20h/semaine, CA +180%',
      testimonial: {
        quote: 'Je ne parle qu\'aux leads vraiment intéressés. Le ROI est dingue.',
        author: 'David K.',
        company: 'CloudApp Bénin'
      }
    },
    {
      sector: 'Immobilier',
      icon: '🏢',
      problem: 'Prospects WhatsApp perdus dans le flood de messages, agents oublient de relancer, ventes manquées.',
      solution: 'CRM capte prospects WhatsApp, rappels auto relance J+2, J+7, J+30. Historique complet des interactions.',
      result: 'Relances systématiques, taux de closing +80%, satisfaction client +40%',
      testimonial: {
        quote: 'Avant je perdais 50% de mes leads. Maintenant zéro perte !',
        author: 'Solange M.',
        company: 'Patrimoine Immo'
      }
    },
    {
      sector: 'Agence Marketing',
      icon: '📊',
      problem: 'Gestion de prospects clients multiples chaotique, pas de visibilité sur pipeline, prévisions impossibles.',
      solution: 'Un CRM par client, pipelines dédiés, analytics consolidées. Vision claire de tous les pipelines.',
      result: 'Visibilité 100%, prévisions CA précises à 95%, satisfaction clients +60%',
      testimonial: {
        quote: 'Mes clients adorent voir leur pipeline en temps réel. Transparence totale.',
        author: 'Éric D.',
        company: 'Digital Agency Pro'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Leads perdus',
        before: '40% (oublis, emails perdus)',
        after: '0% (capture auto + rappels)',
        improvement: '-100%'
      },
      {
        metric: 'Temps de saisie données',
        before: '10 min/lead',
        after: '0 min (auto + IA)',
        improvement: '-100%'
      },
      {
        metric: 'Taux de conversion leads',
        before: '5%',
        after: '15%',
        improvement: '+200%'
      },
      {
        metric: 'Durée cycle de vente',
        before: '45 jours',
        after: '25 jours',
        improvement: '-44%'
      }
    ],
    investment: {
      monthlyPrice: 3000,
      setupTime: '8 minutes',
      totalYearOne: 36000
    },
    gains: {
      labourSavings: 960000,
      revenueIncrease: 2400000,
      totalYearOne: 3360000
    },
    roiPercentage: 9233,
    paybackPeriod: '4 jours'
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
        included: true,
        limits: 'Jusqu\'à 1 000 prospects'
      },
      {
        plan: 'Professionnel',
        price: 5000,
        included: true,
        limits: 'Jusqu\'à 10 000 prospects'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Prospects illimités'
      }
    ],
    recommendation: 'Pack Professionnel recommandé pour équipes commerciales actives.'
  },
  
  faq: [
    {
      question: 'Quelle est la différence entre un prospect et un client ?',
      answer: 'Un prospect est un contact potentiel pas encore converti. Une fois qu\'il achète/signe, il devient un client et peut être déplacé vers un module CRM Clients (séparé). Le module Prospects se concentre uniquement sur l\'acquisition et la conversion.'
    },
    {
      question: 'Comment fonctionne le scoring IA ?',
      answer: 'L\'IA analyse plusieurs signaux : source du lead, engagement (emails ouverts, clics, pages vues), données démographiques, comportement, vitesse de réponse. Elle attribue un score de 0 (très froid) à 100 (ultra chaud). Le scoring s\'améliore avec le temps en apprenant de vos conversions réelles.'
    },
    {
      question: 'Puis-je importer ma base de prospects existante ?',
      answer: 'Oui ! Importez via CSV ou Excel. Mappez les colonnes avec les champs du CRM, et c\'est importé. L\'IA enrichira automatiquement les données manquantes. Support pour imports massifs (jusqu\'à 100 000 lignes selon votre pack).'
    },
    {
      question: 'Les séquences email sont-elles personnalisables ?',
      answer: 'Totalement. Créez des séquences avec déclencheurs custom (ex: "Si score >70 et pas d\'interaction depuis 3 jours, envoyer email X"). Personnalisez chaque email avec variables dynamiques (prénom, entreprise, source, score...). Templates disponibles pour démarrer vite.'
    },
    {
      question: 'Puis-je assigner des prospects à des commerciaux spécifiques ?',
      answer: 'Oui, deux méthodes : 1) Assignment manuel (glissez-déposez sur un commercial), 2) Assignment automatique par règles (ex: leads Paris → Commercial A, leads Lyon → Commercial B). Chaque commercial ne voit que ses prospects (ou tous selon permissions).'
    },
    {
      question: 'Comment éviter les doublons ?',
      answer: 'Le système détecte automatiquement les doublons par email ou téléphone. Si un doublon est détecté, vous êtes alerté et pouvez : 1) Fusionner les fiches, 2) Garder séparées, 3) Ignorer. L\'IA propose la meilleure action selon le contexte.'
    },
    {
      question: 'Puis-je créer des champs personnalisés ?',
      answer: 'Oui ! Ajoutez autant de champs custom que nécessaire : texte, nombre, date, liste déroulante, case à cocher. Exemple pour immobilier : "Budget", "Type de bien recherché", "Timeline d\'achat". Les champs custom sont utilisables dans filtres, séquences, et exports.'
    },
    {
      question: 'Les rappels fonctionnent-ils hors connexion ?',
      answer: 'Les rappels sont des notifications système (email + notification navigateur/mobile). Vous les recevez même hors ligne. À la reconnexion, vous voyez tous les rappels manqués. Vous pouvez aussi configurer des SMS de rappel (option payante).'
    },
    {
      question: 'Puis-je voir les statistiques de mon équipe ?',
      answer: 'Oui, dashboard manager avec : nombre de prospects par commercial, taux de conversion individuel, temps moyen de closing, activité quotidienne. Parfait pour coaching et optimisation des performances. Exportez les rapports pour réunions commerciales.'
    },
    {
      question: 'Que se passe-t-il avec les prospects perdus ?',
      answer: 'Vous marquez la raison de perte (prix trop élevé, timing, concurrence...). Le prospect va dans "Perdus" mais reste accessible. L\'IA analyse les raisons de perte pour vous aider à améliorer votre processus. Vous pouvez réactiver un prospect perdu à tout moment (ex: nouvelle offre).'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation CRM Prospects 22 pages',
      format: 'PDF',
      size: '3.5 MB',
      url: '/downloads/prospects-crm-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Maîtriser le CRM en 20 min',
      format: 'MP4',
      size: '70 MB',
      url: '/videos/prospects-crm-tutorial.mp4'
    },
    {
      type: 'Template Import',
      description: 'Modèle CSV d\'import prospects',
      format: 'CSV',
      size: '15 KB',
      url: '/downloads/prospects-import-template.csv'
    },
    {
      type: 'Playbook',
      description: 'Playbook commercial + séquences',
      format: 'PDF',
      size: '4 MB',
      url: '/downloads/prospects-playbook.pdf'
    }
  ],
  
  metadata: {
    difficulty: 'intermédiaire',
    estimatedSetupTime: '8 minutes',
    minimumPlan: 'Essentiel (3 000 FCFA/mois)',
    integrations: ['Email', 'WhatsApp', 'Formulaires Web', 'Facebook Leads', 'LinkedIn', 'Calendly', 'Zapier'],
    tags: ['crm', 'prospects', 'leads', 'vente', 'pipeline', 'scoring', 'IA', 'conversion']
  }
};
