import { CompleteModuleData } from '@/types/module';

export const mesBotsModule: CompleteModuleData = {
  id: 'mes-bots',
  icon: '🤖',
  title: 'Mes Bots - Gestion Centralisée',
  category: 'Core',
  badge: 'Popular',
  
  presentation: {
    shortDescription: 'Centralisez et gérez tous vos agents IA depuis un tableau de bord unique et intuitif.',
    fullDescription: [
      'Mes Bots est votre centre de contrôle central pour gérer tous vos agents conversationnels. Visualisez en un coup d\'œil tous vos bots actifs, leurs performances, et gérez-les individuellement ou en masse.',
      'Cette interface intuitive vous permet de surveiller l\'activité de chaque bot, consulter les statistiques en temps réel, activer/désactiver des agents, et gérer les paramètres avancés. Parfait pour les entreprises qui gèrent plusieurs bots sur différents canaux.',
      'Avec Mes Bots, économisez du temps en centralisant la gestion : mises à jour groupées, duplication de bots performants, archivage, et export de données. Idéal pour scaler votre stratégie conversationnelle.'
    ],
    videoUrl: '/videos/mes-bots-demo.mp4',
    screenshots: [
      '/images/mes-bots-dashboard.png',
      '/images/mes-bots-list.png',
      '/images/mes-bots-analytics.png',
      '/images/mes-bots-settings.png'
    ]
  },
  
  features: [
    {
      name: 'Vue d\'Ensemble Centralisée',
      description: 'Tableau de bord unique affichant tous vos bots avec statut, performances, et alertes en temps réel.',
      advantage: 'Gain de temps -80% dans la gestion multi-bots',
      howToUse: [
        'Accédez à "Mes Bots" dans le menu principal',
        'Visualisez la liste de tous vos agents',
        'Cliquez sur un bot pour voir les détails'
      ]
    },
    {
      name: 'Gestion par Lots',
      description: 'Activez, désactivez, ou mettez à jour plusieurs bots simultanément en quelques clics.',
      advantage: 'Déploiement de mises à jour 10x plus rapide',
      howToUse: [
        'Sélectionnez les bots via les checkboxes',
        'Choisissez l\'action groupée dans le menu',
        'Confirmez et exécutez'
      ]
    },
    {
      name: 'Statistiques en Temps Réel',
      description: 'Suivez les métriques clés : conversations actives, taux de satisfaction, temps de réponse moyen par bot.',
      advantage: 'Décisions data-driven pour optimiser les performances',
      howToUse: [
        'Chaque carte de bot affiche les KPIs principaux',
        'Cliquez pour accéder aux analytics détaillés',
        'Exportez les rapports en CSV/PDF'
      ]
    },
    {
      name: 'Duplication de Bots',
      description: 'Clonez un bot performant pour le déployer sur un autre canal ou pour un autre département.',
      advantage: 'Réduction du temps de configuration de -90%',
      howToUse: [
        'Sélectionnez le bot à dupliquer',
        'Cliquez sur "Dupliquer"',
        'Personnalisez le nom et les paramètres'
      ]
    },
    {
      name: 'Gestion des Permissions',
      description: 'Attribuez des rôles (admin, éditeur, lecteur) pour contrôler qui peut modifier chaque bot.',
      advantage: 'Sécurité renforcée et collaboration fluide',
      howToUse: [
        'Accédez aux paramètres du bot',
        'Section "Permissions"',
        'Ajoutez des utilisateurs avec leurs rôles'
      ]
    },
    {
      name: 'Historique et Versioning',
      description: 'Consultez l\'historique des modifications et restaurez une version antérieure si besoin.',
      advantage: 'Zéro risque de perte de configuration',
      howToUse: [
        'Onglet "Historique" dans les paramètres',
        'Visualisez toutes les modifications',
        'Cliquez "Restaurer" pour revenir en arrière'
      ]
    },
    {
      name: 'Archivage Intelligent',
      description: 'Archivez les bots inactifs sans les supprimer pour garder un environnement propre.',
      advantage: 'Organisation optimale, aucune donnée perdue',
      howToUse: [
        'Cliquez sur "..." dans la carte du bot',
        'Sélectionnez "Archiver"',
        'Restaurez à tout moment depuis "Bots Archivés"'
      ]
    },
    {
      name: 'Filtres et Recherche Avancés',
      description: 'Trouvez rapidement un bot par nom, canal, statut, ou performance.',
      advantage: 'Productivité +50% pour grandes organisations',
      howToUse: [
        'Utilisez la barre de recherche en haut',
        'Appliquez des filtres (statut, canal, date)',
        'Sauvegardez vos vues personnalisées'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Accès Mes Bots] --> B[Vue Liste Bots]
    B --> C{Action Souhaitée}
    C -->|Consulter| D[Détails Bot + Analytics]
    C -->|Modifier| E[Édition Paramètres]
    C -->|Dupliquer| F[Création Clone]
    C -->|Gérer en Masse| G[Sélection Multiple]
    G --> H[Action Groupée]
    H --> I[Mise à Jour Appliquée]
    D --> J[Export Rapports]
    E --> K[Sauvegarde Auto]
    F --> L[Nouveau Bot Créé]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Accès au Dashboard',
        description: 'L\'utilisateur ouvre le module "Mes Bots" et voit immédiatement tous ses agents IA'
      },
      {
        step: 2,
        title: 'Sélection d\'Action',
        description: 'Choix entre consultation détaillée, édition, duplication ou gestion en masse'
      },
      {
        step: 3,
        title: 'Exécution',
        description: 'L\'action est appliquée avec confirmation et sauvegarde automatique'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Compte Bot.bj actif',
      'Au moins un bot créé',
      'Accès au tableau de bord'
    ],
    estimatedTime: '3 minutes',
    steps: [
      {
        number: 1,
        title: 'Accéder à Mes Bots',
        duration: '30 secondes',
        actions: [
          'Connectez-vous à votre compte Bot.bj',
          'Dans le menu latéral gauche, cliquez sur "🤖 Mes Bots"',
          'La page se charge avec tous vos bots'
        ],
        screenshot: '/images/steps/mes-bots-step1.png',
        expectedResult: 'Vous voyez une grille de cartes affichant tous vos bots avec leur statut',
        commonErrors: [
          {
            error: 'Page vide alors que j\'ai créé des bots',
            solution: 'Vérifiez les filtres actifs en haut de page, cliquez sur "Réinitialiser les filtres"'
          }
        ]
      },
      {
        number: 2,
        title: 'Explorer un Bot',
        duration: '1 minute',
        actions: [
          'Cliquez sur la carte d\'un bot pour ouvrir les détails',
          'Consultez les onglets : Aperçu, Analytics, Paramètres, Historique',
          'Visualisez les métriques en temps réel'
        ],
        screenshot: '/images/steps/mes-bots-step2.png',
        expectedResult: 'Interface détaillée avec graphiques de performances et options de configuration',
        commonErrors: [
          {
            error: 'Statistiques non à jour',
            solution: 'Cliquez sur l\'icône rafraîchir (⟳) en haut à droite'
          }
        ]
      },
      {
        number: 3,
        title: 'Modifier un Bot',
        duration: '2 minutes',
        actions: [
          'Dans les détails du bot, cliquez sur "Modifier"',
          'Changez le nom, la description, ou les paramètres avancés',
          'Testez en direct avec le simulateur intégré',
          'Cliquez "Enregistrer"'
        ],
        screenshot: '/images/steps/mes-bots-step3.png',
        expectedResult: 'Modifications sauvegardées, notification de confirmation affichée',
        commonErrors: [
          {
            error: 'Bouton "Enregistrer" grisé',
            solution: 'Vérifiez que tous les champs obligatoires (marqués *) sont remplis'
          }
        ]
      },
      {
        number: 4,
        title: 'Dupliquer un Bot (Optionnel)',
        duration: '1 minute',
        actions: [
          'Dans la carte du bot ou les détails, cliquez sur "⋮" (trois points)',
          'Sélectionnez "Dupliquer"',
          'Donnez un nouveau nom au clone',
          'Choisissez le canal de déploiement',
          'Confirmez'
        ],
        screenshot: '/images/steps/mes-bots-step4.png',
        expectedResult: 'Un nouveau bot identique est créé et apparaît dans votre liste',
        commonErrors: [
          {
            error: 'Erreur "Limite de bots atteinte"',
            solution: 'Passez à un pack supérieur ou archivez des bots inactifs'
          }
        ]
      },
      {
        number: 5,
        title: 'Gestion en Masse',
        duration: '1 minute',
        actions: [
          'Cochez les cases de plusieurs bots',
          'Une barre d\'actions apparaît en haut',
          'Choisissez une action : Activer, Désactiver, Archiver, Supprimer',
          'Confirmez l\'action groupée'
        ],
        screenshot: '/images/steps/mes-bots-step5.png',
        expectedResult: 'Tous les bots sélectionnés sont mis à jour simultanément',
        commonErrors: [
          {
            error: 'Certains bots non mis à jour',
            solution: 'Vérifiez les permissions, certains bots peuvent être verrouillés par un admin'
          }
        ]
      }
    ],
    finalResult: {
      description: 'Vous maîtrisez la gestion centralisée de tous vos bots ! Vous pouvez maintenant les surveiller, les modifier, et les optimiser efficacement.',
      metrics: [
        'Temps de gestion : -80%',
        'Visibilité : 100% des bots en un coup d\'œil',
        'Productivité : +50%',
        'Organisation : 5/5'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'E-commerce Multi-Marques',
      icon: '🛒',
      problem: 'Gestion de 15 bots (un par boutique) devenue chaotique, impossible de suivre les performances.',
      solution: 'Mes Bots centralise tout : tableau de bord unifié, analytics comparatives, mises à jour groupées.',
      result: 'Temps de gestion -85%, détection rapide des bots sous-performants, amélioration globale +40%',
      testimonial: {
        quote: 'Avant c\'était l\'enfer, maintenant je gère mes 15 bots en 10 minutes par jour !',
        author: 'Aminata K.',
        company: 'Fashion Group Bénin'
      }
    },
    {
      sector: 'Agences Marketing',
      icon: '📱',
      problem: 'Gestion de bots clients complexe, besoin de permissions granulaires et rapports individuels.',
      solution: 'Système de permissions par bot + exports personnalisés pour chaque client.',
      result: 'Satisfaction clients +60%, facturation automatisée basée sur les métriques',
      testimonial: {
        quote: 'Mes clients adorent avoir accès aux analytics de leur bot en temps réel.',
        author: 'Jean-Marc D.',
        company: 'Digital Agency Cotonou'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Temps de gestion quotidien',
        before: '2h (gestion manuelle)',
        after: '15 min',
        improvement: '-87%'
      },
      {
        metric: 'Visibilité sur les performances',
        before: '30% (données éparpillées)',
        after: '100% (dashboard unifié)',
        improvement: '+233%'
      },
      {
        metric: 'Temps de déploiement nouveau bot',
        before: '2h (configuration from scratch)',
        after: '5 min (duplication)',
        improvement: '-96%'
      },
      {
        metric: 'Erreurs de configuration',
        before: '15/mois',
        after: '1/mois (versioning)',
        improvement: '-93%'
      }
    ],
    investment: {
      monthlyPrice: 0,
      setupTime: '0 minute (déjà inclus)',
      totalYearOne: 0
    },
    gains: {
      labourSavings: 840000,
      revenueIncrease: 300000,
      totalYearOne: 1140000
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
        limits: 'Jusqu\'à 3 bots'
      },
      {
        plan: 'Essentiel',
        price: 3000,
        included: true,
        limits: 'Jusqu\'à 10 bots'
      },
      {
        plan: 'Professionnel',
        price: 5000,
        included: true,
        limits: 'Jusqu\'à 50 bots'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Bots illimités'
      }
    ],
    recommendation: 'Module inclus dans tous les packs ! La limite dépend du nombre de bots que vous créez.'
  },
  
  faq: [
    {
      question: 'Combien de bots puis-je gérer avec Mes Bots ?',
      answer: 'Le nombre dépend de votre pack : 3 bots en Découverte, 10 en Essentiel, 50 en Professionnel, illimité en pack Ventes. Chaque bot peut être déployé sur plusieurs canaux (Web, WhatsApp, Facebook, etc.).'
    },
    {
      question: 'Puis-je donner accès à mes collaborateurs ?',
      answer: 'Oui ! Gérez les permissions individuellement par bot. Rôles disponibles : Admin (tous droits), Éditeur (modification), Lecteur (consultation seule). Idéal pour les équipes et agences.'
    },
    {
      question: 'Les statistiques sont-elles en temps réel ?',
      answer: 'Oui, les métriques clés (conversations actives, taux de satisfaction, temps de réponse) sont mises à jour en temps réel. Les rapports détaillés sont actualisés toutes les 5 minutes.'
    },
    {
      question: 'Puis-je exporter les données de mes bots ?',
      answer: 'Absolument ! Exportez les analytics en CSV ou PDF pour chaque bot ou en rapport global. Incluez les conversations, métriques, et logs. Pratique pour reporting client ou analyse interne.'
    },
    {
      question: 'Que se passe-t-il si je supprime un bot par erreur ?',
      answer: 'Les bots supprimés vont dans la corbeille pendant 30 jours. Vous pouvez les restaurer à tout moment durant cette période. Passé 30 jours, suppression définitive (mais historique conservé si option activée).'
    },
    {
      question: 'Puis-je déplacer un bot vers un autre workspace ?',
      answer: 'Oui, via le menu "Transférer". Sélectionnez le bot, choisissez le workspace de destination, et confirmez. Utile pour réorganisation ou transfert client.'
    },
    {
      question: 'Comment dupliquer un bot pour un autre canal ?',
      answer: 'Cliquez sur "Dupliquer" dans le menu du bot. Donnez un nouveau nom, sélectionnez le canal cible (WhatsApp, Web, Facebook...), et validez. Toute la configuration est copiée, vous n\'avez qu\'à adapter les détails spécifiques au canal.'
    },
    {
      question: 'Y a-t-il un historique des modifications ?',
      answer: 'Oui, chaque bot a un onglet "Historique" listant toutes les modifications (qui, quand, quoi). Vous pouvez restaurer une version antérieure en un clic. Parfait pour audits et résolution de problèmes.'
    },
    {
      question: 'Puis-je créer des vues personnalisées ?',
      answer: 'Oui ! Filtrez par statut, canal, performance, date de création, puis sauvegardez votre vue. Créez plusieurs vues (ex: "Bots actifs", "Bots en test", "Bots haute performance") pour switcher rapidement.'
    },
    {
      question: 'Comment activer/désactiver un bot rapidement ?',
      answer: 'Chaque carte de bot a un toggle ON/OFF en haut à droite. Un clic suffit pour activer ou mettre en pause un bot. Pour activer/désactiver plusieurs bots, utilisez la sélection multiple et l\'action groupée.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation Mes Bots 12 pages',
      format: 'PDF',
      size: '1.8 MB',
      url: '/downloads/mes-bots-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Gestion avancée de multiples bots',
      format: 'MP4',
      size: '35 MB',
      url: '/videos/mes-bots-tutorial.mp4'
    },
    {
      type: 'Template',
      description: 'Template de rapport de performance',
      format: 'Excel',
      size: '120 KB',
      url: '/downloads/mes-bots-report-template.xlsx'
    },
    {
      type: 'Checklist',
      description: 'Checklist d\'optimisation bots',
      format: 'PDF',
      size: '250 KB',
      url: '/downloads/mes-bots-checklist.pdf'
    }
  ],
  
  metadata: {
    difficulty: 'débutant',
    estimatedSetupTime: '0 minute (déjà actif)',
    minimumPlan: 'Découverte (Gratuit)',
    integrations: ['Tous les canaux', 'Analytics', 'Permissions', 'Export'],
    tags: ['gestion', 'dashboard', 'multi-bots', 'analytics', 'productivité', 'central']
  }
};
