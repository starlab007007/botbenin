import { CompleteModuleData } from '@/types/module';

export const whatsappConnectModule: CompleteModuleData = {
  id: 'whatsapp-connect',
  icon: '💬',
  title: 'WhatsApp Connect - Intégration Officielle',
  category: 'Communication',
  badge: 'Popular',
  
  presentation: {
    shortDescription: 'Connectez votre numéro WhatsApp Business officiel et automatisez vos conversations avec l\'IA.',
    fullDescription: [
      'WhatsApp Connect est votre pont officiel vers l\'écosystème WhatsApp Business. Connectez votre numéro professionnel existant ou obtenez-en un nouveau, et transformez WhatsApp en canal de vente et support ultra-performant alimenté par l\'IA.',
      'Intégration API officielle WhatsApp Business garantissant conformité, sécurité, et accès aux fonctionnalités avancées : messages templates, boutons interactifs, médias riches, statuts vérifiés. Vos clients conversent sur leur app préférée, vos agents gagnent 70% de temps.',
      'Centralisez toutes vos conversations WhatsApp dans une inbox unifiée Bot.bj. L\'IA répond automatiquement aux questions fréquentes, qualifie les leads, prend des commandes, et transfère les cas complexes aux humains. Résultat : support 24/7, conversions +40%, satisfaction client maximale.'
    ],
    videoUrl: '/videos/whatsapp-connect-demo.mp4',
    screenshots: [
      '/images/whatsapp-connect-setup.png',
      '/images/whatsapp-connect-inbox.png',
      '/images/whatsapp-connect-automation.png',
      '/images/whatsapp-connect-analytics.png'
    ]
  },
  
  features: [
    {
      name: 'Connexion API Officielle',
      description: 'Intégration via WhatsApp Business API officielle, garantissant conformité, sécurité et accès à toutes les fonctionnalités.',
      advantage: 'Badge vert vérifié, confiance client +95%',
      howToUse: [
        'Fournissez votre numéro WhatsApp Business',
        'Vérification en 2 min via code OTP',
        'Numéro connecté et badge vert activé'
      ]
    },
    {
      name: 'Inbox Unifiée Multi-Agents',
      description: 'Toutes les conversations WhatsApp centralisées dans une inbox collaborative pour vos équipes.',
      advantage: 'Productivité +60%, aucune conversation perdue',
      howToUse: [
        'Accédez à l\'inbox depuis le dashboard',
        'Assignez des conversations à des agents',
        'Collaborez avec notes internes'
      ]
    },
    {
      name: 'Réponses Automatiques IA',
      description: 'L\'IA répond instantanément aux questions fréquentes, 24/7, dans la langue du client.',
      advantage: 'Temps de réponse <5 sec, satisfaction +40%',
      howToUse: [
        'Configurez les réponses dans "Automatisation"',
        'L\'IA apprend de vos conversations passées',
        'Mode auto ou approbation humaine'
      ]
    },
    {
      name: 'Messages Templates Approuvés',
      description: 'Créez et utilisez des templates de messages pré-approuvés par WhatsApp pour notifications proactives.',
      advantage: 'Communication pro, taux d\'ouverture 98%',
      howToUse: [
        'Créez un template dans l\'interface',
        'Soumettez pour approbation WhatsApp (24-48h)',
        'Envoyez en masse ou déclenché par événement'
      ]
    },
    {
      name: 'Boutons & Menus Interactifs',
      description: 'Messages avec boutons cliquables, listes de choix, et réponses rapides pour expérience fluide.',
      advantage: 'Engagement +80%, conversions +35%',
      howToUse: [
        'Dans le builder de message, ajoutez "Boutons"',
        'Configurez jusqu\'à 3 boutons par message',
        'Définissez l\'action de chaque bouton'
      ]
    },
    {
      name: 'Médias Riches',
      description: 'Envoyez et recevez images, vidéos, PDF, localisation GPS, contacts, et messages vocaux.',
      advantage: 'Communication complète, résolution 1er contact +50%',
      howToUse: [
        'Glissez-déposez un fichier dans la conversation',
        'Ou cliquez sur l\'icône trombone',
        'Fichiers jusqu\'à 100 MB supportés'
      ]
    },
    {
      name: 'Qualification Automatique de Leads',
      description: 'Le bot pose des questions de qualification et transfère les leads chauds aux commerciaux avec le contexte.',
      advantage: 'Taux de conversion +120%, temps de vente -40%',
      howToUse: [
        'Configurez le flow de qualification',
        'Définissez les critères "lead chaud"',
        'Paramétrez le transfert (email, CRM, notif)'
      ]
    },
    {
      name: 'Catalogues Produits',
      description: 'Intégrez votre catalogue produits, clients peuvent parcourir et commander directement dans WhatsApp.',
      advantage: 'Vente conversationnelle, panier moyen +25%',
      howToUse: [
        'Importez votre catalogue (CSV ou sync site)',
        'Le bot présente les produits avec images/prix',
        'Prise de commande automatique'
      ]
    },
    {
      name: 'Analytics Avancées',
      description: 'Mesurez tout : taux de réponse, temps de résolution, satisfaction, pics d\'activité, top sujets.',
      advantage: 'Optimisation continue basée sur data',
      howToUse: [
        'Dashboard Analytics WhatsApp',
        'Visualisez les KPIs en temps réel',
        'Exportez les rapports CSV/PDF'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Client envoie message WhatsApp] --> B[Réception Bot.bj]
    B --> C{IA peut répondre?}
    C -->|Oui| D[Réponse Auto IA]
    C -->|Non| E[Transfert Agent Humain]
    D --> F{Besoin Humain?}
    F -->|Non| G[Conversation Terminée]
    F -->|Oui| E
    E --> H[Agent Répond]
    H --> I[Résolution]
    I --> J[Feedback Client]
    J --> K[Analytics & Apprentissage IA]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Réception Message',
        description: 'Le client envoie un message sur votre numéro WhatsApp Business connecté'
      },
      {
        step: 2,
        title: 'Analyse IA',
        description: 'L\'IA analyse le message, le contexte, et l\'historique pour décider de la réponse'
      },
      {
        step: 3,
        title: 'Réponse ou Transfert',
        description: 'L\'IA répond automatiquement (80% des cas) ou transfère à un humain (20%)'
      },
      {
        step: 4,
        title: 'Apprentissage Continu',
        description: 'Chaque conversation améliore l\'IA pour des réponses futures encore meilleures'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Numéro de téléphone dédié (pas votre numéro personnel)',
      'Compte Facebook Business Manager (gratuit)',
      'Documents d\'entreprise pour vérification (selon pays)'
    ],
    estimatedTime: '15 minutes',
    steps: [
      {
        number: 1,
        title: 'Préparer le Numéro WhatsApp',
        duration: '2 minutes',
        actions: [
          'Si vous avez déjà WhatsApp Business sur ce numéro, sauvegardez et désinstallez l\'app',
          'Assurez-vous que le numéro peut recevoir un SMS ou appel vocal',
          'Notez le numéro au format international (ex: +22912345678)'
        ],
        screenshot: '/images/steps/whatsapp-step1.png',
        expectedResult: 'Numéro prêt, pas d\'app WhatsApp active dessus',
        commonErrors: [
          {
            error: 'Numéro déjà utilisé par un autre compte WhatsApp Business API',
            solution: 'Contactez l\'ancien fournisseur pour libérer le numéro, ou utilisez un nouveau numéro'
          }
        ]
      },
      {
        number: 2,
        title: 'Démarrer la Connexion dans Bot.bj',
        duration: '1 minute',
        actions: [
          'Connectez-vous à Bot.bj',
          'Menu "Canaux" → "WhatsApp Connect"',
          'Cliquez "Connecter un Numéro WhatsApp"',
          'Choisissez "J\'ai déjà un numéro" ou "Obtenir un nouveau numéro"'
        ],
        screenshot: '/images/steps/whatsapp-step2.png',
        expectedResult: 'Assistant de configuration WhatsApp lancé',
        commonErrors: []
      },
      {
        number: 3,
        title: 'Vérifier le Numéro',
        duration: '2 minutes',
        actions: [
          'Entrez votre numéro au format international',
          'Choisissez la méthode de vérification : SMS ou Appel Vocal',
          'Recevez le code de vérification à 6 chiffres',
          'Entrez le code dans l\'interface',
          'Validation automatique'
        ],
        screenshot: '/images/steps/whatsapp-step3.png',
        expectedResult: 'Message "Numéro vérifié avec succès ✅"',
        commonErrors: [
          {
            error: 'Code de vérification non reçu',
            solution: 'Réessayez avec l\'autre méthode (Appel si vous aviez choisi SMS). Vérifiez que le numéro est correct.'
          },
          {
            error: 'Code invalide',
            solution: 'Le code expire après 10 minutes. Redemandez un nouveau code.'
          }
        ]
      },
      {
        number: 4,
        title: 'Connecter Facebook Business Manager',
        duration: '3 minutes',
        actions: [
          'Cliquez "Connecter Facebook Business"',
          'Connectez-vous à votre compte Facebook (créez un Business Manager si besoin)',
          'Autorisez Bot.bj à accéder à votre compte Business',
          'Sélectionnez le compte Business à utiliser',
          'Confirmez'
        ],
        screenshot: '/images/steps/whatsapp-step4.png',
        expectedResult: 'Facebook Business Manager connecté, badge vert visible',
        commonErrors: [
          {
            error: 'Pas de compte Business Manager',
            solution: 'Créez-en un gratuitement sur business.facebook.com, revenez ensuite sur Bot.bj'
          },
          {
            error: 'Erreur de permissions',
            solution: 'Assurez-vous d\'être admin du Business Manager. Ajoutez-vous si besoin dans les paramètres FB.'
          }
        ]
      },
      {
        number: 5,
        title: 'Configurer le Profil Business',
        duration: '3 minutes',
        actions: [
          'Entrez le nom de votre entreprise (affiché aux clients)',
          'Ajoutez une description (140 caractères max)',
          'Uploadez votre logo (carré, 640x640 min)',
          'Sélectionnez votre secteur d\'activité',
          'Ajoutez adresse, site web, email (optionnel)',
          'Cliquez "Enregistrer"'
        ],
        screenshot: '/images/steps/whatsapp-step5.png',
        expectedResult: 'Profil configuré, aperçu visible de ce que les clients verront',
        commonErrors: [
          {
            error: 'Logo rejeté',
            solution: 'Format accepté : JPG ou PNG, carré, min 640x640, max 5 MB, pas de texte trop petit'
          }
        ]
      },
      {
        number: 6,
        title: 'Paramétrer les Automatisations',
        duration: '2 minutes',
        actions: [
          'Onglet "Automatisation"',
          'Activez le "Message de Bienvenue" (envoyé au 1er contact)',
          'Configurez le "Message d\'Absence" (horaires fermeture)',
          'Activez les "Réponses Rapides" pour questions fréquentes',
          'Testez en vous envoyant un message'
        ],
        screenshot: '/images/steps/whatsapp-step6.png',
        expectedResult: 'Automatisations actives, test réussi',
        commonErrors: [
          {
            error: 'Message de test non reçu',
            solution: 'Vérifiez que votre numéro perso n\'est pas bloqué. Attendez 1-2 min pour propagation.'
          }
        ]
      },
      {
        number: 7,
        title: 'Connecter un Bot (Optionnel mais Recommandé)',
        duration: '2 minutes',
        actions: [
          'Onglet "Bots IA"',
          'Cliquez "Connecter un Bot"',
          'Sélectionnez un bot existant ou créez-en un nouveau',
          'Activez le bot sur WhatsApp',
          'Configurez le niveau d\'autonomie (Auto 100% ou Approbation Humaine)'
        ],
        screenshot: '/images/steps/whatsapp-step7.png',
        expectedResult: 'Bot connecté, prêt à répondre automatiquement',
        commonErrors: []
      },
      {
        number: 8,
        title: 'Inviter l\'Équipe',
        duration: '1 minute',
        actions: [
          'Onglet "Équipe"',
          'Cliquez "Inviter un Membre"',
          'Entrez l\'email et choisissez le rôle (Admin, Agent, Lecteur)',
          'Envoyez l\'invitation',
          'Le membre reçoit un email et accède à l\'inbox WhatsApp'
        ],
        screenshot: '/images/steps/whatsapp-step8.png',
        expectedResult: 'Équipe invitée, collaboration active',
        commonErrors: []
      }
    ],
    finalResult: {
      description: 'Votre numéro WhatsApp Business est officiellement connecté à Bot.bj ! Vous pouvez maintenant recevoir et gérer toutes vos conversations depuis une inbox unifiée, automatiser avec l\'IA, et offrir un support 24/7 à vos clients.',
      metrics: [
        'Temps de connexion : 15 minutes',
        'Taux d\'automatisation : 80%+',
        'Disponibilité : 24/7',
        'Satisfaction client : +40%'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'E-commerce',
      icon: '🛒',
      problem: 'Clients veulent commander via WhatsApp mais traitement manuel prend 2h par commande, erreurs fréquentes.',
      solution: 'Bot WhatsApp prend commandes automatiquement : sélection produits, calcul total, paiement, confirmation.',
      result: 'Commandes traitées en <5 min, erreurs -95%, ventes WhatsApp +200%, panier moyen +30%',
      testimonial: {
        quote: '70% de nos ventes passent maintenant par WhatsApp. Le bot gère tout !',
        author: 'Yasmine B.',
        company: 'BéninMode'
      }
    },
    {
      sector: 'Restaurant / Livraison',
      icon: '🍕',
      problem: 'Appels téléphoniques pour commandes saturent la cuisine, erreurs de prise de commande, clients frustrés.',
      solution: 'Bot WhatsApp avec catalogue menu, prise de commande guidée, calcul automatique, envoi en cuisine.',
      result: 'Commandes WhatsApp 50% du total, erreurs -90%, satisfaction +45%, équipe focus sur préparation',
      testimonial: {
        quote: 'Plus de téléphone qui sonne sans arrêt. Les commandes WhatsApp sont parfaites !',
        author: 'Chef Moussa',
        company: 'Délices de Cotonou'
      }
    },
    {
      sector: 'Services B2B',
      icon: '💼',
      problem: 'Leads arrivent par WhatsApp mais commerciaux répondent tardivement, 60% des leads perdus.',
      solution: 'Bot qualifie les leads en temps réel (besoin, budget, urgence), transfère leads chauds immédiatement.',
      result: 'Taux de conversion leads +180%, temps de réponse <1 min, commerciaux traitent 3x plus de leads',
      testimonial: {
        quote: 'Le bot WhatsApp me envoie que des leads qualifiés. Je ferme 80% !',
        author: 'Ismail K.',
        company: 'Tech Solutions'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Temps de réponse client',
        before: '2-6 heures (heures bureau)',
        after: '<1 minute (24/7)',
        improvement: '-99%'
      },
      {
        metric: 'Conversations gérées/jour',
        before: '50 (2 agents)',
        after: '500+ (automatisé)',
        improvement: '+900%'
      },
      {
        metric: 'Coût par conversation',
        before: '200 FCFA (temps agent)',
        after: '10 FCFA (automatisé)',
        improvement: '-95%'
      },
      {
        metric: 'Taux de conversion WhatsApp',
        before: '5% (réponses lentes)',
        after: '15% (réponse instant)',
        improvement: '+200%'
      }
    ],
    investment: {
      monthlyPrice: 3000,
      setupTime: '15 minutes',
      totalYearOne: 36000
    },
    gains: {
      labourSavings: 720000,
      revenueIncrease: 1200000,
      totalYearOne: 1920000
    },
    roiPercentage: 5233,
    paybackPeriod: '1 semaine'
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
    recommendation: 'Pack Professionnel recommandé pour exploiter pleinement WhatsApp Business.'
  },
  
  faq: [
    {
      question: 'Ai-je besoin d\'un numéro de téléphone séparé ?',
      answer: 'Oui, il faut un numéro dédié différent de votre numéro personnel. Vous pouvez utiliser votre numéro WhatsApp Business actuel, ou obtenir un nouveau numéro via Bot.bj (service payant additionnel). Le numéro doit pouvoir recevoir SMS/appels pour vérification.'
    },
    {
      question: 'Quelle est la différence avec WhatsApp Business (l\'app) ?',
      answer: 'WhatsApp Business API (via Bot.bj) offre : inbox multi-agents, automatisation IA, messages templates approuvés, intégrations CRM, analytics avancées, support illimité de clients. L\'app WhatsApp Business est limitée à 1 personne, pas d\'automatisation, 4 appareils max.'
    },
    {
      question: 'Mes clients doivent-ils installer quelque chose ?',
      answer: 'Non ! Vos clients utilisent leur WhatsApp habituel (app ou WhatsApp Web). Ils vous contactent comme n\'importe quel contact. L\'IA et les automatisations fonctionnent en arrière-plan, invisible pour eux.'
    },
    {
      question: 'Puis-je envoyer des messages proactifs à mes clients ?',
      answer: 'Oui, mais avec des règles WhatsApp : vous pouvez envoyer des messages proactifs pendant 24h après le dernier message du client. Au-delà, utilisez des "Message Templates" pré-approuvés par WhatsApp (notifications commande, RDV, promotions autorisées). Bot.bj gère tout ça automatiquement.'
    },
    {
      question: 'Combien coûtent les messages WhatsApp ?',
      answer: 'Les messages entrants (client → vous) sont gratuits. Les messages sortants (vous → client) : gratuits pendant la fenêtre 24h. Hors fenêtre, les templates ont un coût minime (5-10 FCFA selon pays/type). Bot.bj inclut un quota mensuel, au-delà c\'est à la consommation.'
    },
    {
      question: 'Puis-je utiliser mon numéro WhatsApp existant ?',
      answer: 'Oui, si c\'est un numéro WhatsApp Business (pas WhatsApp perso). Vous devrez migrer vers l\'API (on vous guide, c\'est simple). Historique des conversations peut être conservé. Si c\'est un WhatsApp perso, il faut un nouveau numéro pro.'
    },
    {
      question: 'Comment fonctionne le transfert vers un agent humain ?',
      answer: 'Le bot détecte quand il ne peut pas répondre (question complexe, client insiste). Il notifie un agent dispo dans l\'inbox, transfère avec tout le contexte. L\'agent prend la main, répond. Fin de conversation, le bot reprend si client revient. Transition fluide, client ne voit aucune différence.'
    },
    {
      question: 'Puis-je personnaliser l\'apparence de mes messages ?',
      answer: 'Avec WhatsApp, l\'apparence est standardisée (bulle verte/blanche). Vous personnalisez : nom d\'affichage, photo de profil, description, et surtout le contenu/ton des messages. Utilisez les fonctionnalités riches : boutons, listes, images, vidéos, documents, émojis.'
    },
    {
      question: 'Quelles langues sont supportées ?',
      answer: 'Le bot supporte 90+ langues. Il détecte automatiquement la langue du client et répond dans cette langue. Vous configurez les langues prioritaires pour votre marché (ex: Français, Anglais, Fon, Yoruba pour le Bénin).'
    },
    {
      question: 'Y a-t-il des limites sur le nombre de messages ?',
      answer: 'Dépend de votre pack Bot.bj : Essentiel (1 000 conv/mois), Professionnel (5 000), Ventes (illimité). Une "conversation" = fenêtre de 24h avec un client (nb de messages illimité dans cette fenêtre). Au-delà, coût additionnel minime ou upgrade de pack.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation WhatsApp Connect 18 pages',
      format: 'PDF',
      size: '2.8 MB',
      url: '/downloads/whatsapp-connect-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Configuration complète en 15 min',
      format: 'MP4',
      size: '60 MB',
      url: '/videos/whatsapp-connect-tutorial.mp4'
    },
    {
      type: 'Templates Messages',
      description: 'Pack 30 templates pré-approuvés',
      format: 'PDF',
      size: '1.2 MB',
      url: '/downloads/whatsapp-templates.pdf'
    },
    {
      type: 'Checklist',
      description: 'Checklist conformité WhatsApp',
      format: 'PDF',
      size: '200 KB',
      url: '/downloads/whatsapp-compliance-checklist.pdf'
    }
  ],
  
  metadata: {
    difficulty: 'intermédiaire',
    estimatedSetupTime: '15 minutes',
    minimumPlan: 'Essentiel (3 000 FCFA/mois)',
    integrations: ['WhatsApp Business API', 'Facebook Business', 'CRM', 'Catalogues', 'Paiement'],
    tags: ['whatsapp', 'messaging', 'business', 'automation', '24/7', 'mobile', 'conversationnel']
  }
};
