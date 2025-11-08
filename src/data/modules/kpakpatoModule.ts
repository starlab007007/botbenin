import { CompleteModuleData } from '@/types/module';

export const kpakpatoModule: CompleteModuleData = {
  id: 'kpakpato',
  icon: '🤖',
  title: 'Kpakpato – Agent IA Vocal',
  category: 'Core',
  badge: 'Popular',
  
  presentation: {
    shortDescription: 'Agent conversationnel vocal intelligent qui répond à vos clients en temps réel avec une voix naturelle.',
    fullDescription: [
      'Kpakpato est l\'agent IA vocal de Bot.bj qui révolutionne la communication client. Grâce à la reconnaissance vocale avancée et la synthèse vocale naturelle, Kpakpato peut converser avec vos clients comme un humain, 24h/24 et 7j/7.',
      'Contrairement aux chatbots textuels classiques, Kpakpato utilise l\'intelligence artificielle conversationnelle pour comprendre le contexte, maintenir une conversation fluide et fournir des réponses pertinentes en temps réel. Intégré à ElevenLabs pour une qualité vocale exceptionnelle.',
      'Avec Kpakpato, transformez votre service client en une expérience vocale premium qui augmente la satisfaction client de +40% tout en réduisant les coûts opérationnels de -70%.'
    ],
    videoUrl: '/videos/kpakpato-demo.mp4',
    screenshots: [
      '/images/kpakpato-interface.png',
      '/images/kpakpato-conversation.png',
      '/images/kpakpato-settings.png',
      '/images/kpakpato-analytics.png'
    ]
  },
  
  features: [
    {
      name: 'Conversation Vocale en Temps Réel',
      description: 'Discutez naturellement avec l\'IA comme avec un humain. Reconnaissance vocale instantanée et réponses fluides.',
      advantage: 'Expérience utilisateur premium, taux d\'engagement +60%',
      howToUse: [
        'Cliquez sur le bouton microphone',
        'Parlez naturellement',
        'L\'IA répond instantanément à voix haute'
      ]
    },
    {
      name: 'Reconnaissance Vocale Multilingue',
      description: 'Compréhension de plusieurs langues et dialectes africains avec une précision de 95%.',
      advantage: 'Servez vos clients dans leur langue maternelle',
      howToUse: [
        'Configurez les langues supportées',
        'L\'IA détecte automatiquement la langue',
        'Répond dans la même langue'
      ]
    },
    {
      name: 'Synthèse Vocale Naturelle',
      description: 'Voix ultra-réaliste propulsée par ElevenLabs, indiscernable d\'un humain.',
      advantage: 'Expérience authentique, +40% satisfaction client',
      howToUse: [
        'Choisissez la voix dans les paramètres',
        'Personnalisez le ton et le débit',
        'Testez différentes voix'
      ]
    },
    {
      name: 'Contexte Conversationnel',
      description: 'Mémoire de conversation pour des échanges cohérents sur plusieurs messages.',
      advantage: 'Conversations naturelles sans répétition',
      howToUse: [
        'Démarrez une conversation',
        'L\'IA se souvient du contexte',
        'Référez-vous à des messages précédents'
      ]
    },
    {
      name: 'Intégration ElevenLabs',
      description: 'API de synthèse vocale de pointe pour une qualité audio exceptionnelle.',
      advantage: 'Voix premium, qualité studio',
      howToUse: [
        'Activez dans paramètres avancés',
        'Sélectionnez votre voix préférée',
        'Profitez de la qualité supérieure'
      ]
    },
    {
      name: 'Historique des Conversations',
      description: 'Enregistrement et export de toutes les conversations vocales pour analyse.',
      advantage: 'Amélioration continue basée sur les données',
      howToUse: [
        'Accédez à l\'onglet Historique',
        'Consultez les transcriptions',
        'Exportez en CSV ou PDF'
      ]
    },
    {
      name: 'Disponibilité 24/7',
      description: 'Agent toujours disponible, sans pause, week-end ou jours fériés.',
      advantage: 'Ne perdez plus jamais un client',
      howToUse: [
        'Activez le mode "Toujours actif"',
        'Configurez les horaires si nécessaire',
        'Laissez Kpakpato gérer'
      ]
    },
    {
      name: 'Personnalisation Avancée',
      description: 'Formez Kpakpato sur vos données spécifiques et votre tone of voice.',
      advantage: 'Agent parfaitement aligné avec votre marque',
      howToUse: [
        'Uploadez votre base de connaissances',
        'Définissez le style de réponse',
        'Testez et ajustez'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Utilisateur parle] --> B[Capture Audio]
    B --> C[Transcription Temps Réel]
    C --> D[Analyse IA Context]
    D --> E[Génération Réponse]
    E --> F[Synthèse Vocale ElevenLabs]
    F --> G[Lecture Audio]
    G --> H{Conversation Continue?}
    H -->|Oui| A
    H -->|Non| I[Fin + Export Historique]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Utilisateur parle',
        description: 'Le client pose sa question ou exprime son besoin à voix haute via le microphone'
      },
      {
        step: 2,
        title: 'Capture Audio',
        description: 'Le système enregistre l\'audio en haute qualité avec réduction de bruit'
      },
      {
        step: 3,
        title: 'Transcription en Temps Réel',
        description: 'L\'audio est converti en texte instantanément avec 95% de précision'
      },
      {
        step: 4,
        title: 'Analyse IA Contextuelle',
        description: 'L\'IA analyse le message en tenant compte du contexte conversationnel'
      },
      {
        step: 5,
        title: 'Génération de Réponse',
        description: 'Création d\'une réponse pertinente et personnalisée basée sur votre base de connaissances'
      },
      {
        step: 6,
        title: 'Synthèse Vocale',
        description: 'Conversion de la réponse en audio naturel via ElevenLabs'
      },
      {
        step: 7,
        title: 'Lecture Audio',
        description: 'Diffusion de la réponse vocale au client'
      },
      {
        step: 8,
        title: 'Continuation ou Fin',
        description: 'Le client peut poursuivre la conversation ou terminer'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Navigateur web moderne (Chrome, Firefox, Safari)',
      'Microphone fonctionnel',
      'Connexion internet stable',
      'Compte Bot.bj actif'
    ],
    estimatedTime: '5 minutes',
    steps: [
      {
        number: 1,
        title: 'Accéder à Kpakpato',
        duration: '30 secondes',
        actions: [
          'Connectez-vous à votre compte Bot.bj',
          'Dans le menu latéral, cliquez sur "Kpakpato"',
          'La page de conversation s\'affiche'
        ],
        screenshot: '/images/steps/kpakpato-step1.png',
        expectedResult: 'Vous voyez l\'interface Kpakpato avec un bouton micro au centre',
        commonErrors: [
          {
            error: 'Menu Kpakpato non visible',
            solution: 'Vérifiez que vous êtes connecté et que votre pack inclut Kpakpato'
          }
        ]
      },
      {
        number: 2,
        title: 'Autoriser le Microphone',
        duration: '30 secondes',
        actions: [
          'Cliquez sur le bouton "Parler à Kpakpato"',
          'Autorisez l\'accès au microphone dans la popup du navigateur',
          'Attendez la confirmation (LED verte)'
        ],
        screenshot: '/images/steps/kpakpato-step2.png',
        expectedResult: 'Une LED verte indique que le microphone est actif',
        commonErrors: [
          {
            error: 'Microphone bloqué',
            solution: 'Vérifiez les paramètres du navigateur et autorisez l\'accès au micro'
          }
        ]
      },
      {
        number: 3,
        title: 'Démarrer la Conversation',
        duration: '10 secondes',
        actions: [
          'Cliquez sur "Commencer"',
          'Écoutez le message de bienvenue de Kpakpato',
          'Attendez la fin du message'
        ],
        screenshot: '/images/steps/kpakpato-step3.png',
        expectedResult: 'Kpakpato vous accueille vocalement',
        commonErrors: []
      },
      {
        number: 4,
        title: 'Poser votre Question',
        duration: 'Variable',
        actions: [
          'Parlez clairement dans votre microphone',
          'Observez la visualisation de l\'onde sonore',
          'Attendez la transcription en temps réel'
        ],
        screenshot: '/images/steps/kpakpato-step4.png',
        expectedResult: 'Votre question apparaît en texte à l\'écran',
        commonErrors: [
          {
            error: 'Transcription incorrecte',
            solution: 'Parlez plus lentement et clairement, réduisez le bruit ambiant'
          }
        ]
      },
      {
        number: 5,
        title: 'Écouter la Réponse',
        duration: 'Variable',
        actions: [
          'L\'IA analyse votre question',
          'Une réponse vocale est générée',
          'Écoutez la réponse de Kpakpato'
        ],
        screenshot: '/images/steps/kpakpato-step5.png',
        expectedResult: 'Kpakpato répond de manière naturelle et pertinente',
        commonErrors: []
      },
      {
        number: 6,
        title: 'Continuer ou Terminer',
        duration: '10 secondes',
        actions: [
          'Pour continuer, posez une autre question',
          'Pour terminer, cliquez sur "Arrêter"',
          'Optionnel : exportez l\'historique'
        ],
        screenshot: '/images/steps/kpakpato-step6.png',
        expectedResult: 'Conversation terminée ou prolongée selon votre choix',
        commonErrors: []
      }
    ],
    finalResult: {
      description: 'Vous avez mené votre première conversation vocale avec Kpakpato ! L\'agent IA a compris vos questions et y a répondu de manière naturelle et contextuelle.',
      metrics: [
        'Temps de réponse : <2 secondes',
        'Précision : 95%',
        'Satisfaction : 4.8/5',
        'Économie vs humain : -70%'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'Hôtellerie & Tourisme',
      icon: '🏨',
      problem: 'Les clients appellent hors horaires pour réserver ou obtenir des informations, perdant 30% de réservations potentielles.',
      solution: 'Kpakpato répond 24/7 aux appels, prend les réservations, répond aux questions sur les chambres, services, tarifs et disponibilités.',
      result: '+40% de réservations nocturnes, -60% de charge du staff, 98% satisfaction client',
      testimonial: {
        quote: 'Kpakpato a transformé notre service client. Nous ne perdons plus aucune réservation, même à 3h du matin !',
        author: 'Aïcha Diallo',
        company: 'Hôtel La Perle, Cotonou'
      }
    },
    {
      sector: 'E-commerce',
      icon: '🛒',
      problem: 'Support client débordé avec 200+ appels/jour, temps d\'attente de 15 minutes, clients frustrés.',
      solution: 'Kpakpato gère 80% des demandes courantes : suivi de commande, retours, disponibilité produits.',
      result: 'Temps d\'attente réduit à 30 secondes, -70% coûts support, +25% satisfaction',
      testimonial: {
        quote: 'Nos clients adorent la rapidité de Kpakpato. Support client transformé !',
        author: 'Jean Koné',
        company: 'MarketPlace BJ'
      }
    },
    {
      sector: 'Santé & Médical',
      icon: '🏥',
      problem: 'Secrétaires médicales submergées, patients attendent des heures pour prendre RDV par téléphone.',
      solution: 'Kpakpato prend les rendez-vous, vérifie les disponibilités, envoie les confirmations SMS.',
      result: '500 RDV automatisés/mois, -80% charge administrative, 0 erreur de planification',
      testimonial: {
        quote: 'Révolution dans notre gestion des rendez-vous. Kpakpato est devenu indispensable.',
        author: 'Dr. Amina Touré',
        company: 'Clinique Santé Plus'
      }
    },
    {
      sector: 'Éducation',
      icon: '🎓',
      problem: 'Étudiants ont des questions 24/7 mais support limité aux heures de bureau.',
      solution: 'Kpakpato répond aux questions sur les cours, inscriptions, dates d\'examens, procédures.',
      result: '1000+ questions traitées/semaine, +50% satisfaction étudiants, -90% emails support',
      testimonial: {
        quote: 'Les étudiants peuvent obtenir des réponses à 2h du matin. C\'est incroyable !',
        author: 'Prof. Michel Dossou',
        company: 'Université Nationale'
      }
    },
    {
      sector: 'Services Financiers',
      icon: '💳',
      problem: 'Clients appellent constamment pour connaître leur solde, faire des virements, poser des questions.',
      solution: 'Kpakpato fournit les informations de compte, guide pour les opérations, répond aux FAQ.',
      result: '-85% appels vers centre d\'appel, +30% utilisation services en ligne, NPS +40 points',
      testimonial: {
        quote: 'Nos clients gèrent leur compte par voix, c\'est fluide et sécurisé.',
        author: 'Fatou Sarr',
        company: 'BankAfrica'
      }
    },
    {
      sector: 'Immobilier',
      icon: '🏠',
      problem: 'Agents débordés, prospects appellent mais tombent sur répondeur, visites non schedulées.',
      solution: 'Kpakpato qualifie les prospects, planifie les visites, répond aux questions sur les biens.',
      result: '+60% taux de conversion prospects, 0 appel manqué, 100% visites confirmées',
      testimonial: {
        quote: 'Chaque prospect est traité immédiatement. Notre taux de conversion a explosé.',
        author: 'Mamadou Ba',
        company: 'Immo Prestige'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Disponibilité',
        before: '8h/jour (9h-17h)',
        after: '24/7 non-stop',
        improvement: '+200%'
      },
      {
        metric: 'Coût mensuel',
        before: '100 000 FCFA',
        after: '0 FCFA (pack gratuit)',
        improvement: '-100%'
      },
      {
        metric: 'Temps de réponse',
        before: '5-15 minutes',
        after: '<2 secondes',
        improvement: '+99%'
      },
      {
        metric: 'Appels simultanés',
        before: '1-2 agents',
        after: 'Illimité',
        improvement: '+∞'
      },
      {
        metric: 'Satisfaction client',
        before: '70%',
        after: '95%',
        improvement: '+36%'
      },
      {
        metric: 'Taux de conversion',
        before: '15%',
        after: '35%',
        improvement: '+133%'
      }
    ],
    investment: {
      monthlyPrice: 0,
      setupTime: '5 minutes',
      totalYearOne: 0
    },
    gains: {
      labourSavings: 480000,
      revenueIncrease: 300000,
      totalYearOne: 780000
    },
    roiPercentage: Infinity,
    paybackPeriod: 'Immédiat'
  },
  
  pricing: {
    plansComparison: [
      {
        plan: 'Découverte',
        price: 0,
        included: true,
        limits: '100 conversations vocales/mois'
      },
      {
        plan: 'Essentiel',
        price: 3000,
        included: true,
        limits: '1 000 conversations/mois'
      },
      {
        plan: 'Professionnel',
        price: 5000,
        included: true,
        limits: '5 000 conversations/mois'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Illimité'
      }
    ],
    recommendation: 'Kpakpato est inclus dans tous les packs ! Commencez gratuitement.'
  },
  
  faq: [
    {
      question: 'Comment activer Kpakpato sur mon site web ?',
      answer: 'Copiez le code embed fourni dans Paramètres > Intégrations > Kpakpato Widget. Collez-le avant la balise </body> de votre site. Le bouton Kpakpato apparaîtra automatiquement en bas à droite. Personnalisez les couleurs et la position dans les paramètres.'
    },
    {
      question: 'Quelles langues sont supportées par Kpakpato ?',
      answer: 'Kpakpato supporte le français, l\'anglais, le fon, le yoruba, le dioula et 50+ autres langues. La détection de langue est automatique avec 95% de précision. Vous pouvez limiter les langues acceptées dans les paramètres.'
    },
    {
      question: 'Puis-je personnaliser la voix de Kpakpato ?',
      answer: 'Oui ! Choisissez parmi 30+ voix ultra-réalistes (hommes, femmes, différents accents). Ajustez le débit, le ton et l\'émotion. Pack Pro+ permet de créer une voix clonée unique pour votre marque.'
    },
    {
      question: 'Comment former Kpakpato sur mes données spécifiques ?',
      answer: 'Dans l\'onglet Base de Connaissances, uploadez vos documents (PDF, Word, Excel, CSV). Kpakpato analyse et indexe automatiquement. Vous pouvez aussi ajouter des Q&R manuelles pour des réponses précises.'
    },
    {
      question: 'Combien coûte chaque conversation avec Kpakpato ?',
      answer: 'Pack Découverte : 100 conversations gratuites/mois. Au-delà : 50 FCFA/conversation. Packs payants incluent 1000-5000 conversations puis tarif dégressif. Pack Ventes : illimité sans surcoût.'
    },
    {
      question: 'Y a-t-il des limites de durée pour les conversations ?',
      answer: 'Non, les conversations peuvent durer aussi longtemps que nécessaire. Cependant, après 30 minutes d\'inactivité, la session se termine automatiquement pour libérer les ressources.'
    },
    {
      question: 'Puis-je intégrer Kpakpato dans mon application mobile ?',
      answer: 'Oui ! Notre SDK mobile (iOS/Android) permet d\'intégrer Kpakpato nativement. Documentation complète disponible. Contactez le support pour l\'accès API (packs Pro+).'
    },
    {
      question: 'Comment exporter les conversations pour analyse ?',
      answer: 'Onglet Historique > Sélectionnez la période > Exportez en CSV, Excel ou PDF. Inclut : transcriptions complètes, durées, sentiments détectés, sujets abordés. Intégration Google Sheets disponible.'
    },
    {
      question: 'Quelle est la qualité audio de Kpakpato ?',
      answer: 'Qualité studio 44.1 kHz avec réduction de bruit avancée. Voix ElevenLabs indiscernables d\'un humain. Latence <500ms pour un dialogue fluide. Compatible tous navigateurs et réseaux 3G/4G/5G.'
    },
    {
      question: 'Kpakpato fonctionne-t-il hors ligne ?',
      answer: 'Non, Kpakpato nécessite une connexion internet pour la reconnaissance vocale et l\'IA. Cependant, il fonctionne parfaitement sur 3G+ avec latence minimale. Mode économie de données disponible.'
    },
    {
      question: 'Comment sécuriser les données des conversations ?',
      answer: 'Toutes les conversations sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Conformité RGPD. Option d\'auto-suppression après X jours. Hébergement en Afrique pour souveraineté des données.'
    },
    {
      question: 'Puis-je transférer vers un humain si Kpakpato ne peut pas répondre ?',
      answer: 'Oui ! Transfert automatique ou manuel vers vos agents. Kpakpato fournit le contexte complet à l\'agent humain. Configuration des règles de transfert dans Paramètres > Escalade.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation Kpakpato 15 pages',
      format: 'PDF',
      size: '2.5 MB',
      url: '/downloads/kpakpato-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Formation vidéo complète 8 minutes',
      format: 'MP4',
      size: '45 MB',
      url: '/videos/kpakpato-tutorial.mp4'
    },
    {
      type: 'Checklist',
      description: 'Liste de contrôle configuration',
      format: 'PDF',
      size: '200 KB',
      url: '/downloads/kpakpato-checklist.pdf'
    },
    {
      type: 'Template',
      description: 'Modèle base de connaissances',
      format: 'Excel',
      size: '50 KB',
      url: '/downloads/kpakpato-template.xlsx'
    },
    {
      type: 'Screenshots',
      description: 'Pack 10 captures HD',
      format: 'ZIP',
      size: '5 MB',
      url: '/downloads/kpakpato-screenshots.zip'
    }
  ],
  
  metadata: {
    difficulty: 'débutant',
    estimatedSetupTime: '5 minutes',
    minimumPlan: 'Découverte (Gratuit)',
    integrations: ['ElevenLabs', 'OpenAI', 'WhatsApp', 'Téléphonie', 'Widget Web'],
    tags: ['vocal', 'temps-réel', 'IA', 'conversationnel', 'support-client', '24/7']
  }
};
