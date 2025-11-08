import { CompleteModuleData } from '@/types/module';

export const creationBotsModule: CompleteModuleData = {
  id: 'creation-bots',
  icon: '➕',
  title: 'Création de Bots - Builder No-Code',
  category: 'Core',
  badge: 'New',
  
  presentation: {
    shortDescription: 'Créez des agents IA conversationnels puissants en quelques minutes, sans aucune ligne de code.',
    fullDescription: [
      'Le Builder de Création de Bots est votre atelier de conception no-code pour créer des agents conversationnels sur mesure. Interface visuelle intuitive par drag-and-drop, modèles prêts à l\'emploi, et personnalisation complète sans compétences techniques.',
      'Créez des bots pour n\'importe quel cas d\'usage : support client, vente, prise de rendez-vous, FAQ automatisée, lead generation, et plus. Configurez la personnalité, le ton, les réponses, les workflows, et déployez sur tous les canaux en un clic.',
      'Avec l\'IA intégrée, vos bots apprennent automatiquement de vos données (site web, documents, historique conversations). Résultat : un agent intelligent qui comprend votre business dès le premier jour. Temps de création moyen : 10 minutes.'
    ],
    videoUrl: '/videos/creation-bots-demo.mp4',
    screenshots: [
      '/images/creation-bots-builder.png',
      '/images/creation-bots-templates.png',
      '/images/creation-bots-training.png',
      '/images/creation-bots-deploy.png'
    ]
  },
  
  features: [
    {
      name: 'Builder Visuel No-Code',
      description: 'Interface drag-and-drop intuitive pour créer des workflows conversationnels complexes sans coder.',
      advantage: 'Création 10x plus rapide qu\'avec du code',
      howToUse: [
        'Glissez-déposez des blocs (message, question, condition, action)',
        'Connectez-les pour créer des flux',
        'Prévisualisez en temps réel'
      ]
    },
    {
      name: 'Modèles Pré-Configurés',
      description: '50+ templates prêts à l\'emploi pour tous les secteurs (commerce, santé, éducation, hôtellerie...).',
      advantage: 'Démarrage instantané, personnalisation en 5 min',
      howToUse: [
        'Parcourez la bibliothèque de templates',
        'Sélectionnez celui qui correspond à votre besoin',
        'Personnalisez les textes et paramètres'
      ]
    },
    {
      name: 'Formation IA Automatique',
      description: 'Donnez l\'URL de votre site, uploadez des docs (PDF, Word, CSV) et l\'IA s\'entraîne automatiquement.',
      advantage: 'Bot expert de votre business en <2 minutes',
      howToUse: [
        'Onglet "Formation" dans le builder',
        'Ajoutez URL ou uploadez fichiers',
        'L\'IA analyse et intègre les connaissances'
      ]
    },
    {
      name: 'Personnalité & Ton Configurables',
      description: 'Choisissez la personnalité (professionnel, amical, humoristique, formel) et le ton de votre bot.',
      advantage: 'Cohérence totale avec votre marque',
      howToUse: [
        'Section "Personnalité"',
        'Sélectionnez un preset ou créez custom',
        'Testez dans le simulateur'
      ]
    },
    {
      name: 'Multi-Langue Natif',
      description: 'Créez des bots multilingues qui détectent et répondent dans la langue du client automatiquement.',
      advantage: 'Expansion internationale simplifiée',
      howToUse: [
        'Activez "Mode Multilingue"',
        'Ajoutez les langues supportées',
        'L\'IA traduit automatiquement ou personnalisez'
      ]
    },
    {
      name: 'Intégrations Avancées',
      description: 'Connectez votre bot à vos outils : CRM, calendrier, paiement, email, webhook personnalisé.',
      advantage: 'Automatisation complète end-to-end',
      howToUse: [
        'Onglet "Intégrations"',
        'Sélectionnez l\'outil (Calendly, Stripe, Mailchimp...)',
        'Configurez l\'authentification et mappings'
      ]
    },
    {
      name: 'Conditions & Logique Avancée',
      description: 'Créez des workflows conditionnels (si/alors) pour des conversations intelligentes et dynamiques.',
      advantage: 'Bots qui s\'adaptent au contexte',
      howToUse: [
        'Ajoutez un bloc "Condition"',
        'Définissez la règle (ex: si score >50)',
        'Connectez les branches oui/non'
      ]
    },
    {
      name: 'Test & Simulateur Intégré',
      description: 'Testez votre bot en temps réel directement dans le builder avant de le déployer.',
      advantage: 'Zéro surprise, bot parfait dès le déploiement',
      howToUse: [
        'Cliquez "Tester" en haut à droite',
        'Discutez avec votre bot comme un client',
        'Modifiez et testez à nouveau'
      ]
    },
    {
      name: 'Déploiement Multi-Canal',
      description: 'Déployez le même bot sur Web, WhatsApp, Facebook Messenger, Instagram d\'un seul clic.',
      advantage: 'Portée maximale, gestion centralisée',
      howToUse: [
        'Bouton "Déployer" après création',
        'Cochez les canaux souhaités',
        'Obtenez les codes d\'intégration'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Nouveau Bot] --> B{Template ou Blank}
    B -->|Template| C[Sélection Template]
    B -->|Blank| D[Canvas Vide]
    C --> E[Personnalisation]
    D --> E
    E --> F[Ajout Blocs Conversation]
    F --> G[Configuration Personnalité]
    G --> H[Formation IA]
    H --> I[Connexion Données/URL]
    I --> J[Test Simulateur]
    J --> K{Bot OK?}
    K -->|Non| E
    K -->|Oui| L[Configuration Intégrations]
    L --> M[Déploiement Multi-Canal]
    M --> N[Bot Actif]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Choix du Point de Départ',
        description: 'Décidez de partir d\'un template (plus rapide) ou de zéro (plus de contrôle)'
      },
      {
        step: 2,
        title: 'Construction Visuelle',
        description: 'Ajoutez des blocs conversationnels et créez le flux de dialogue'
      },
      {
        step: 3,
        title: 'Formation & Test',
        description: 'Entraînez l\'IA sur vos données et testez jusqu\'à satisfaction'
      },
      {
        step: 4,
        title: 'Déploiement',
        description: 'Activez le bot sur les canaux souhaités en un clic'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Compte Bot.bj actif',
      'Idée claire du cas d\'usage du bot',
      'Données à fournir au bot (optionnel : URL site, documents)'
    ],
    estimatedTime: '10 minutes',
    steps: [
      {
        number: 1,
        title: 'Lancer le Builder',
        duration: '30 secondes',
        actions: [
          'Connectez-vous à Bot.bj',
          'Cliquez sur "➕ Créer un Bot" ou menu "Création Bots"',
          'La page du builder s\'ouvre'
        ],
        screenshot: '/images/steps/creation-step1.png',
        expectedResult: 'Interface builder avec option Template ou Partir de Zéro',
        commonErrors: [
          {
            error: 'Bouton "Créer un Bot" grisé',
            solution: 'Vous avez atteint la limite de bots de votre pack. Archivez un bot inactif ou passez à un pack supérieur.'
          }
        ]
      },
      {
        number: 2,
        title: 'Choisir Template ou Démarrer de Zéro',
        duration: '1 minute',
        actions: [
          'Option 1 : Cliquez "Parcourir les Templates" → Sélectionnez un modèle → Cliquez "Utiliser"',
          'Option 2 : Cliquez "Partir de Zéro" pour un canvas vierge',
          'Donnez un nom à votre bot'
        ],
        screenshot: '/images/steps/creation-step2.png',
        expectedResult: 'Canvas du builder chargé avec template ou vierge',
        commonErrors: [
          {
            error: 'Templates ne se chargent pas',
            solution: 'Vérifiez votre connexion internet et rechargez la page'
          }
        ]
      },
      {
        number: 3,
        title: 'Construire le Flux Conversationnel',
        duration: '3 minutes',
        actions: [
          'Dans la palette de gauche, glissez des blocs sur le canvas : Message, Question, Condition, Action',
          'Connectez les blocs en cliquant sur les points de connexion',
          'Double-cliquez sur chaque bloc pour éditer le contenu',
          'Utilisez le bloc "Question" pour capturer des infos (nom, email, demande...)'
        ],
        screenshot: '/images/steps/creation-step3.png',
        expectedResult: 'Flux logique de conversation visible sur le canvas',
        commonErrors: [
          {
            error: 'Impossible de connecter deux blocs',
            solution: 'Vérifiez que les types sont compatibles (ex: une Question peut se connecter à une Condition)'
          }
        ]
      },
      {
        number: 4,
        title: 'Configurer la Personnalité',
        duration: '1 minute',
        actions: [
          'Cliquez sur l\'onglet "Personnalité" en haut',
          'Choisissez un ton : Professionnel, Amical, Humoristique, ou Personnalisé',
          'Ajoutez des consignes spécifiques (ex: "Toujours proposer de l\'aide", "Utiliser emojis")',
          'Enregistrez'
        ],
        screenshot: '/images/steps/creation-step4.png',
        expectedResult: 'Personnalité configurée, aperçu du style de réponse visible',
        commonErrors: []
      },
      {
        number: 5,
        title: 'Former l\'IA sur Vos Données',
        duration: '2 minutes',
        actions: [
          'Onglet "Formation IA"',
          'Méthode 1 : Collez l\'URL de votre site → Cliquez "Analyser"',
          'Méthode 2 : Uploadez des fichiers (PDF, Word, CSV) → Cliquez "Traiter"',
          'Méthode 3 : Collez du texte directement → "Intégrer"',
          'L\'IA analyse (30 sec - 2 min selon volume)'
        ],
        screenshot: '/images/steps/creation-step5.png',
        expectedResult: 'Message "Formation terminée, X informations apprises"',
        commonErrors: [
          {
            error: 'Analyse d\'URL échouée',
            solution: 'Vérifiez que l\'URL est accessible publiquement (pas de login requis)'
          },
          {
            error: 'Fichier trop volumineux',
            solution: 'Limite 10 MB par fichier. Divisez en plusieurs fichiers ou contactez support pour augmenter.'
          }
        ]
      },
      {
        number: 6,
        title: 'Tester dans le Simulateur',
        duration: '2 minutes',
        actions: [
          'Cliquez sur "🧪 Tester" en haut à droite',
          'Une fenêtre de chat s\'ouvre',
          'Discutez avec votre bot comme un client',
          'Testez différents scénarios (questions fréquentes, cas limites)',
          'Si besoin, retournez dans le builder pour ajuster'
        ],
        screenshot: '/images/steps/creation-step6.png',
        expectedResult: 'Conversation fluide, le bot répond correctement à vos questions',
        commonErrors: [
          {
            error: 'Bot répond hors sujet',
            solution: 'Ajoutez plus de données d\'entraînement ou affinez les consignes de personnalité'
          }
        ]
      },
      {
        number: 7,
        title: 'Configurer les Intégrations (Optionnel)',
        duration: '2 minutes',
        actions: [
          'Onglet "Intégrations"',
          'Activez les intégrations souhaitées : CRM (HubSpot, Salesforce), Calendrier (Calendly, Google), Paiement (Stripe), Email (Mailchimp)',
          'Authentifiez-vous avec votre compte',
          'Configurez les mappings (ex: champ email du bot → champ email CRM)'
        ],
        screenshot: '/images/steps/creation-step7.png',
        expectedResult: 'Intégrations actives, test d\'envoi réussi',
        commonErrors: [
          {
            error: 'Authentification CRM échouée',
            solution: 'Vérifiez vos identifiants et que l\'API est activée côté CRM'
          }
        ]
      },
      {
        number: 8,
        title: 'Déployer le Bot',
        duration: '1 minute',
        actions: [
          'Cliquez sur "🚀 Déployer" en haut à droite',
          'Cochez les canaux : Site Web, WhatsApp, Facebook Messenger, Instagram',
          'Pour Site Web : Copiez le code embed et collez-le dans votre site avant </body>',
          'Pour WhatsApp : Scannez le QR code ou entrez le numéro',
          'Confirmez le déploiement'
        ],
        screenshot: '/images/steps/creation-step8.png',
        expectedResult: 'Bot actif sur les canaux sélectionnés, code d\'intégration disponible',
        commonErrors: [
          {
            error: 'Code embed ne fonctionne pas sur le site',
            solution: 'Vérifiez que le code est bien avant </body> et que votre site autorise les iframes'
          }
        ]
      }
    ],
    finalResult: {
      description: 'Félicitations ! Votre bot est créé, formé, testé et déployé. Il répond maintenant automatiquement à vos clients 24/7 sur tous les canaux configurés.',
      metrics: [
        'Temps de création : 10 minutes',
        'Temps de réponse bot : <2 secondes',
        'Disponibilité : 24/7',
        'Coût vs humain : -70%'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'E-commerce',
      icon: '🛍️',
      problem: 'Support client débordé, 200+ questions répétitives par jour sur livraisons, retours, produits.',
      solution: 'Bot créé en 10 min avec template E-commerce, formé sur FAQ et catalogue produits.',
      result: '85% de questions traitées automatiquement, -60% de charge support, satisfaction +35%',
      testimonial: {
        quote: 'J\'ai créé mon bot en 10 minutes. Il répond mieux que mes agents juniors !',
        author: 'Koffi A.',
        company: 'BéninShop'
      }
    },
    {
      sector: 'Santé - Clinique',
      icon: '🏥',
      problem: 'Secrétariat surchargé pour prises de RDV, patients en attente téléphonique jusqu\'à 20 min.',
      solution: 'Bot de prise de RDV connecté à Google Calendar, avec questions pré-consultation.',
      result: '90% des RDV pris automatiquement, temps d\'attente -95%, patients satisfaits +50%',
      testimonial: {
        quote: 'Nos patients adorent prendre RDV à 23h via WhatsApp. Révolutionnaire !',
        author: 'Dr. Fatou S.',
        company: 'Clinique Étoile'
      }
    },
    {
      sector: 'Immobilier',
      icon: '🏠',
      problem: 'Agents perdent du temps à qualifier des leads non sérieux, taux de conversion faible.',
      solution: 'Bot de qualification avec questions budget, timeline, type de bien. Leads qualifiés envoyés au CRM.',
      result: 'Taux de conversion leads +120%, temps agents économisé 30h/semaine',
      testimonial: {
        quote: 'Mon bot qualifie les leads H24. Je ne traite que les chauds. Ventes x2 !',
        author: 'Ibrahim T.',
        company: 'Immo Plus'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Temps de création bot',
        before: '3 semaines (développement)',
        after: '10 minutes',
        improvement: '-99.5%'
      },
      {
        metric: 'Coût de création',
        before: '500 000 FCFA (dev externe)',
        after: '0 FCFA (inclus)',
        improvement: '-100%'
      },
      {
        metric: 'Compétences requises',
        before: 'Développeur expert',
        after: 'Aucune (no-code)',
        improvement: 'Accessible à tous'
      },
      {
        metric: 'Temps de modification',
        before: '2 jours (dev + tests)',
        after: '5 minutes',
        improvement: '-99%'
      }
    ],
    investment: {
      monthlyPrice: 0,
      setupTime: '10 minutes',
      totalYearOne: 0
    },
    gains: {
      labourSavings: 6000000,
      revenueIncrease: 1200000,
      totalYearOne: 7200000
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
        limits: 'Jusqu\'à 3 bots, templates de base'
      },
      {
        plan: 'Essentiel',
        price: 3000,
        included: true,
        limits: 'Jusqu\'à 10 bots, tous templates'
      },
      {
        plan: 'Professionnel',
        price: 5000,
        included: true,
        limits: 'Jusqu\'à 50 bots, intégrations avancées'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Bots illimités, support prioritaire'
      }
    ],
    recommendation: 'Module inclus dans tous les packs ! Commencez gratuitement avec 3 bots.'
  },
  
  faq: [
    {
      question: 'Ai-je besoin de compétences techniques pour créer un bot ?',
      answer: 'Absolument pas ! Le builder est 100% no-code, interface visuelle par drag-and-drop. Si vous savez utiliser PowerPoint, vous savez créer un bot sur Bot.bj. Temps d\'apprentissage : 5 minutes.'
    },
    {
      question: 'Combien de temps faut-il pour créer un bot ?',
      answer: 'En moyenne 10 minutes pour un bot simple (FAQ, support). 30 minutes pour un bot complexe avec intégrations CRM, paiements, et logique conditionnelle. Avec templates, encore plus rapide (5 min).'
    },
    {
      question: 'Puis-je modifier un bot après déploiement ?',
      answer: 'Oui, à tout moment ! Les modifications sont appliquées instantanément. Testez avant de publier pour éviter les surprises. L\'historique des versions permet de revenir en arrière si besoin.'
    },
    {
      question: 'Comment le bot apprend-il sur mon entreprise ?',
      answer: 'Trois méthodes : 1) Donnez l\'URL de votre site (le bot scrape et analyse), 2) Uploadez vos documents (PDF, Word, FAQ, etc.), 3) Importez des conversations passées. L\'IA extrait automatiquement les connaissances. Mise à jour possible à tout moment.'
    },
    {
      question: 'Puis-je créer un bot multilingue ?',
      answer: 'Oui ! Activez "Mode Multilingue" dans les paramètres. Le bot détecte automatiquement la langue du client et répond dans cette langue. Vous pouvez traduire vous-même ou laisser l\'IA traduire automatiquement (90+ langues supportées).'
    },
    {
      question: 'Quels canaux sont supportés ?',
      answer: 'Déployez votre bot sur : Site Web (widget), WhatsApp, Facebook Messenger, Instagram DM, Telegram. Le même bot fonctionne sur tous les canaux, gestion centralisée depuis Bot.bj.'
    },
    {
      question: 'Puis-je connecter mon bot à mon CRM/Calendrier ?',
      answer: 'Oui, intégrations natives avec : HubSpot, Salesforce, Pipedrive (CRM), Calendly, Google Calendar (RDV), Stripe (paiement), Mailchimp, SendGrid (email), Zapier/Make pour connexions custom.'
    },
    {
      question: 'Le bot peut-il gérer des paiements ?',
      answer: 'Oui, avec l\'intégration Stripe. Le bot peut présenter des produits, prendre la commande, encaisser le paiement, et envoyer une confirmation. Parfait pour e-commerce conversationnel.'
    },
    {
      question: 'Que se passe-t-il si le bot ne sait pas répondre ?',
      answer: 'Vous configurez le comportement : 1) Transférer à un humain (support live chat), 2) Enregistrer la question pour formation ultérieure, 3) Réponse générique ("Je transfère à un collègue"). Les questions non résolues remontent dans le dashboard pour amélioration continue.'
    },
    {
      question: 'Puis-je dupliquer un bot existant ?',
      answer: 'Oui, fonction "Dupliquer" dans Mes Bots. Utile pour créer des variantes (ex: même bot en français et anglais, ou même bot pour différentes boutiques). Toute la configuration est copiée, vous modifiez juste les détails spécifiques.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation Création de Bots 20 pages',
      format: 'PDF',
      size: '3.2 MB',
      url: '/downloads/creation-bots-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Créer son premier bot en 10 min',
      format: 'MP4',
      size: '55 MB',
      url: '/videos/creation-bots-tutorial.mp4'
    },
    {
      type: 'Templates Pack',
      description: 'Pack de 50 templates prêts à l\'emploi',
      format: 'ZIP',
      size: '8 MB',
      url: '/downloads/creation-bots-templates.zip'
    },
    {
      type: 'Checklist',
      description: 'Checklist pré-déploiement bot',
      format: 'PDF',
      size: '180 KB',
      url: '/downloads/creation-bots-checklist.pdf'
    }
  ],
  
  metadata: {
    difficulty: 'débutant',
    estimatedSetupTime: '10 minutes',
    minimumPlan: 'Découverte (Gratuit)',
    integrations: ['Tous canaux', 'CRM', 'Calendrier', 'Paiement', 'Email', 'Webhooks'],
    tags: ['no-code', 'builder', 'création', 'drag-drop', 'templates', 'IA', 'formation']
  }
};
