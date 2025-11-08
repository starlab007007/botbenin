export interface PlatformSection {
  id: string;
  title: string;
  icon: string;
  content: PlatformContent[];
}

export interface PlatformContent {
  type: 'text' | 'list' | 'subsection' | 'feature' | 'problem-solution' | 'advantage';
  title?: string;
  content?: string;
  items?: string[];
  features?: Array<{
    name: string;
    description: string;
    benefits: string[];
    howItWorks?: string;
    useCases?: string[];
  }>;
  problems?: Array<{
    problem: string;
    solution: string;
    impact: string;
  }>;
  advantages?: Array<{
    title: string;
    description: string;
    metrics?: string;
  }>;
}

export const platformDocumentation: PlatformSection[] = [
  {
    id: 'diagnostic',
    title: '🔍 Diagnostic de la Plateforme',
    icon: '🔍',
    content: [
      {
        type: 'text',
        content: 'Bot BJ est une plateforme d\'intelligence artificielle conversationnelle complète, conçue spécifiquement pour répondre aux besoins des entreprises africaines en matière d\'automatisation et de gestion de la relation client.'
      },
      {
        type: 'subsection',
        title: '📊 État Actuel de la Plateforme',
        content: 'La plateforme Bot BJ est opérationnelle et offre une suite complète d\'outils pour l\'automatisation des conversations, la gestion des bots IA et l\'analyse des performances.'
      },
      {
        type: 'list',
        title: 'Points Forts',
        items: [
          '✅ Interface utilisateur intuitive et moderne',
          '✅ Intégration WhatsApp Business API fonctionnelle',
          '✅ Système de gestion de bots IA avancé',
          '✅ Analytics en temps réel',
          '✅ Support multi-utilisateurs et multi-sessions',
          '✅ Sécurité renforcée (authentification, chiffrement)',
          '✅ Responsive design (mobile, tablette, desktop)',
          '✅ Support de paiement local (Mobile Money)'
        ]
      },
      {
        type: 'list',
        title: 'Technologies & Infrastructure',
        items: [
          '⚛️ Frontend : React 18 + TypeScript + Tailwind CSS',
          '🗄️ Backend : Supabase (PostgreSQL, Edge Functions)',
          '🤖 IA : Intégration ChatGPT et modèles avancés',
          '📱 Communication : WhatsApp Business API',
          '🔐 Sécurité : Row Level Security (RLS), Protection XSS/CSRF',
          '☁️ Hébergement : Cloud scalable'
        ]
      },
      {
        type: 'subsection',
        title: '🎯 Positionnement Marché',
        content: 'Bot BJ se positionne comme la première plateforme d\'automatisation par IA adaptée au contexte africain, avec des tarifs accessibles, un support local et une intégration des moyens de paiement locaux.'
      }
    ]
  },
  {
    id: 'overview',
    title: '🌟 Vue d\'Ensemble de la Plateforme',
    icon: '🌟',
    content: [
      {
        type: 'text',
        content: 'Bot BJ est une solution no-code qui permet à toute entreprise de créer et déployer des assistants virtuels intelligents pour automatiser leurs communications sur WhatsApp, leur site web et les réseaux sociaux.'
      },
      {
        type: 'subsection',
        title: '🎯 Mission',
        content: 'Démocratiser l\'accès à l\'intelligence artificielle conversationnelle pour les entreprises africaines, en offrant une solution accessible, performante et adaptée aux réalités locales.'
      },
      {
        type: 'subsection',
        title: '👥 Public Cible',
        content: 'PME, e-commerces, hôtels, écoles, agences immobilières, services publics, ONG et toute organisation souhaitant automatiser ses communications clients.'
      },
      {
        type: 'list',
        title: 'Secteurs d\'Activité Couverts',
        items: [
          '🏨 Hôtellerie & Tourisme',
          '🛒 E-commerce & Retail',
          '🎓 Formation & Éducation',
          '🏘️ Immobilier',
          '💼 Services B2B/PME',
          '🎨 Marketing & Communication',
          '🏛️ Services Publics',
          '🤝 ONG & Associations'
        ]
      }
    ]
  },
  {
    id: 'features',
    title: '⚙️ Fonctionnalités Détaillées',
    icon: '⚙️',
    content: [
      {
        type: 'feature',
        features: [
          {
            name: '🤖 Gestion des Bots Intelligents',
            description: 'Créez, configurez et gérez vos assistants virtuels sans écrire une ligne de code.',
            benefits: [
              'Interface drag-and-drop intuitive',
              'Templates pré-configurés par secteur',
              'Personnalisation complète de la personnalité du bot',
              'Formation du bot avec vos propres données',
              'Tests en temps réel avant déploiement'
            ],
            howItWorks: 'Accédez à l\'interface "Gestion des Bots", créez un nouveau bot, définissez sa personnalité (ton, style), configurez les réponses de base, formez-le avec vos données et testez-le avant de le déployer.',
            useCases: [
              'Bot de service client 24/7',
              'Bot de vente et qualification de leads',
              'Bot de réservation et prise de rendez-vous',
              'Bot de support technique',
              'Bot de formation et FAQ'
            ]
          },
          {
            name: '💬 Gestion des Conversations',
            description: 'Interface centralisée pour suivre et gérer toutes vos conversations clients en temps réel.',
            benefits: [
              'Vue unifiée de toutes les conversations',
              'Filtrage avancé (statut, date, tags)',
              'Recherche rapide par mots-clés',
              'Support multi-sessions simultanées',
              'Archivage automatique',
              'Notes et annotations internes',
              'Transfert entre agents humains'
            ],
            howItWorks: 'Accédez au tableau de bord des conversations, visualisez toutes les discussions actives, filtrez par statut ou client, intervenez manuellement si nécessaire, et analysez l\'historique complet.',
            useCases: [
              'Suivi des demandes clients',
              'Intervention humaine en cas de besoin',
              'Analyse des conversations problématiques',
              'Formation du bot avec de nouvelles données'
            ]
          },
          {
            name: '📱 Intégration WhatsApp Business',
            description: 'Connexion native avec WhatsApp Business API pour automatiser vos communications WhatsApp.',
            benefits: [
              'Connexion en 1 clic via QR Code',
              'Réponses automatiques 24/7',
              'Envoi de messages groupés',
              'Templates de messages approuvés',
              'Catalogues produits intégrés',
              'Boutons d\'action rapide',
              'Médias (images, vidéos, documents)',
              'Statut de livraison des messages'
            ],
            howItWorks: 'Connectez votre compte WhatsApp Business en scannant un QR Code, configurez vos messages automatiques, définissez vos workflows et laissez le bot gérer les conversations.',
            useCases: [
              'Confirmation de commandes automatiques',
              'Support client via WhatsApp',
              'Campagnes marketing ciblées',
              'Notifications transactionnelles',
              'Prise de rendez-vous via WhatsApp'
            ]
          },
          {
            name: '🔄 Automatisation des Workflows',
            description: 'Créez des scénarios d\'automatisation complexes sans code pour gérer vos processus métier.',
            benefits: [
              'Éditeur visuel de workflows',
              'Déclencheurs multiples (mots-clés, horaires, événements)',
              'Actions conditionnelles (if/then/else)',
              'Intégrations externes (Google Sheets, CRM, etc.)',
              'Webhooks pour connexions API',
              'Planification de messages',
              'Rappels automatiques',
              'Escalade vers humain si nécessaire'
            ],
            howItWorks: 'Créez un nouveau workflow, définissez les déclencheurs (ex: mot-clé "prix"), configurez les actions à effectuer (ex: envoyer la grille tarifaire), ajoutez des conditions et activez le workflow.',
            useCases: [
              'Qualification automatique de leads',
              'Envoi de devis personnalisés',
              'Confirmation de réservations',
              'Relances automatiques',
              'Collecte de feedback client'
            ]
          },
          {
            name: '📊 Analytics & Reporting',
            description: 'Tableaux de bord complets pour suivre les performances de vos bots et conversations.',
            benefits: [
              'Dashboard temps réel',
              'Métriques clés (taux de réponse, satisfaction, conversion)',
              'Graphiques interactifs',
              'Rapports personnalisables',
              'Export Excel/CSV/PDF',
              'Analyse de sentiment',
              'Identification des questions fréquentes',
              'Performances par période',
              'ROI calculé automatiquement'
            ],
            howItWorks: 'Consultez le tableau de bord principal pour voir vos métriques en temps réel, créez des rapports personnalisés selon vos besoins, exportez les données pour vos analyses internes.',
            useCases: [
              'Suivi de la satisfaction client',
              'Mesure du ROI de l\'automatisation',
              'Identification des points d\'amélioration',
              'Reporting pour la direction',
              'Optimisation des workflows'
            ]
          },
          {
            name: '🎓 Formation & Apprentissage du Bot',
            description: 'Système d\'apprentissage continu permettant d\'améliorer les réponses de votre bot.',
            benefits: [
              'Formation avec vos propres documents',
              'Apprentissage des nouvelles conversations',
              'Correction des réponses erronées',
              'Import de FAQ existantes',
              'Base de connaissances évolutive',
              'Amélioration automatique au fil du temps'
            ],
            howItWorks: 'Importez vos documents (FAQ, guides, catalogues), le bot les analyse et apprend. Corrigez les réponses incorrectes pour améliorer la précision. Le bot s\'améliore automatiquement.',
            useCases: [
              'Intégration de catalogues produits',
              'Formation sur des procédures internes',
              'Apprentissage de nouvelles offres',
              'Adaptation aux feedbacks clients'
            ]
          },
          {
            name: '👥 Gestion Multi-Utilisateurs',
            description: 'Système complet de gestion d\'équipe avec rôles et permissions.',
            benefits: [
              'Rôles prédéfinis (Admin, Manager, Agent)',
              'Permissions granulaires',
              'Attribution de conversations',
              'Statistiques par utilisateur',
              'Collaboration en équipe',
              'Audit trail complet'
            ],
            howItWorks: 'Invitez des membres d\'équipe, assignez-leur des rôles, définissez leurs permissions et suivez leurs performances individuelles.',
            useCases: [
              'Équipe de support client',
              'Équipe commerciale',
              'Gestion par département',
              'Supervision et contrôle qualité'
            ]
          },
          {
            name: '🔐 Sécurité & Conformité',
            description: 'Infrastructure sécurisée et conforme aux normes internationales de protection des données.',
            benefits: [
              'Authentification multi-facteurs (2FA)',
              'Chiffrement des données (AES-256)',
              'Protection XSS et CSRF',
              'Conformité RGPD',
              'Sauvegarde automatique quotidienne',
              'Logs d\'audit complets',
              'Gestion des consentements',
              'Droit à l\'oubli (suppression des données)'
            ],
            howItWorks: 'La sécurité est intégrée à tous les niveaux de la plateforme. Vos données sont chiffrées, sauvegardées automatiquement et vous gardez le contrôle total sur leur utilisation.',
            useCases: [
              'Protection des données clients',
              'Conformité légale',
              'Sécurité des transactions',
              'Confiance des utilisateurs'
            ]
          },
          {
            name: '🌐 Widget Web Intégrable',
            description: 'Chatbot intégrable sur votre site web en quelques clics.',
            benefits: [
              'Code d\'intégration simple',
              'Personnalisation complète (couleurs, logo, textes)',
              'Responsive sur tous les appareils',
              'Mode popup ou pleine page',
              'Déclenchement automatique ou manuel',
              'Synchronisation avec les autres canaux'
            ],
            howItWorks: 'Générez le code d\'intégration depuis votre tableau de bord, personnalisez l\'apparence du widget, copiez-collez le code sur votre site web.',
            useCases: [
              'Support client sur site e-commerce',
              'Génération de leads sur site vitrine',
              'Prise de rendez-vous en ligne',
              'FAQ interactive'
            ]
          },
          {
            name: '💰 Gestion des Paiements',
            description: 'Système de facturation et paiement intégré avec support Mobile Money.',
            benefits: [
              'Paiement Mobile Money (MTN, Moov)',
              'Cartes bancaires internationales',
              'Facturation automatique',
              'Historique des paiements',
              'Gestion des abonnements',
              'Upgrade/downgrade facile',
              'Essai gratuit sans CB'
            ],
            howItWorks: 'Choisissez votre pack, sélectionnez votre mode de paiement (Mobile Money ou CB), validez le paiement et votre compte est activé instantanément.',
            useCases: [
              'Souscription aux packs',
              'Renouvellement automatique',
              'Paiement ponctuel de crédits',
              'Gestion budgétaire'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'problems',
    title: '🎯 Problèmes Résolus par la Plateforme',
    icon: '🎯',
    content: [
      {
        type: 'problem-solution',
        problems: [
          {
            problem: '⏰ Disponibilité limitée du service client',
            solution: 'Bot disponible 24/7 sans interruption, répondant instantanément aux clients à toute heure',
            impact: 'Satisfaction client augmentée de 40%, réduction du temps d\'attente à 0 seconde'
          },
          {
            problem: '💸 Coûts élevés de personnel',
            solution: 'Automatisation de 70% des requêtes clients courantes, libérant le personnel pour les tâches à forte valeur ajoutée',
            impact: 'Économie de 30-50% sur les coûts de support client'
          },
          {
            problem: '📉 Perte de leads par manque de réactivité',
            solution: 'Réponse automatique immédiate aux demandes, qualification et routage intelligent des prospects',
            impact: 'Augmentation de 35% du taux de conversion des leads'
          },
          {
            problem: '😫 Surcharge de travail des équipes',
            solution: 'Gestion automatique des tâches répétitives (FAQ, prise de RDV, confirmation de commandes)',
            impact: 'Gain de 20h/semaine par employé sur les tâches répétitives'
          },
          {
            problem: '📱 Difficulté à gérer WhatsApp Business',
            solution: 'Interface centralisée pour gérer toutes les conversations WhatsApp avec automatisation',
            impact: 'Traitement de 10x plus de conversations simultanées'
          },
          {
            problem: '🔍 Manque de données et insights',
            solution: 'Analytics complets avec métriques, rapports et identification des tendances',
            impact: 'Prise de décision basée sur des données réelles, amélioration continue'
          },
          {
            problem: '🌍 Barrière technique et linguistique',
            solution: 'Interface no-code en français, support local et adaptation au contexte africain',
            impact: 'Déploiement en 24h sans compétences techniques requises'
          },
          {
            problem: '💳 Moyens de paiement inadaptés',
            solution: 'Intégration complète des solutions Mobile Money locales (MTN, Moov)',
            impact: 'Accessibilité pour 100% des entreprises locales'
          },
          {
            problem: '📞 Communication multi-canal complexe',
            solution: 'Gestion unifiée de WhatsApp, web, réseaux sociaux depuis une seule interface',
            impact: 'Cohérence de la communication sur tous les canaux'
          },
          {
            problem: '⚠️ Erreurs humaines dans les réponses',
            solution: 'Réponses standardisées et validées par le bot, garantissant la cohérence',
            impact: 'Réduction de 95% des erreurs dans les réponses clients'
          },
          {
            problem: '📊 Difficulté à mesurer le ROI',
            solution: 'Tableaux de bord avec calcul automatique du ROI et métriques de performance',
            impact: 'Visibilité complète sur le retour sur investissement'
          },
          {
            problem: '🔄 Processus manuels chronophages',
            solution: 'Workflows automatisés pour tous les processus récurrents (relances, confirmations, etc.)',
            impact: 'Automatisation de 80% des tâches répétitives'
          }
        ]
      }
    ]
  },
  {
    id: 'advantages',
    title: '✨ Avantages Compétitifs',
    icon: '✨',
    content: [
      {
        type: 'advantage',
        advantages: [
          {
            title: '🚀 Déploiement Ultra Rapide',
            description: 'Créez et déployez votre premier bot en moins de 24 heures, sans aucune compétence technique requise.',
            metrics: 'Setup complet en 4 étapes, opérationnel le jour même'
          },
          {
            title: '💰 Tarification Accessible',
            description: 'Plans adaptés à tous les budgets, avec option gratuite pour démarrer et tarifs jusqu\'à 10x moins chers que la concurrence internationale.',
            metrics: 'À partir de 0 FCFA, jusqu\'à 15 000 FCFA/mois pour le plan entreprise'
          },
          {
            title: '🇧🇯 Support Local en Français',
            description: 'Équipe basée au Bénin, support en français, compréhension du contexte et des besoins locaux.',
            metrics: 'Support téléphonique et WhatsApp en français, réponse sous 2h'
          },
          {
            title: '📱 Mobile Money Intégré',
            description: 'Premier système d\'automatisation acceptant les paiements Mobile Money (MTN, Moov), adapté au marché africain.',
            metrics: '100% des modes de paiement locaux acceptés'
          },
          {
            title: '🤖 Intelligence Artificielle Avancée',
            description: 'Intégration des derniers modèles d\'IA (ChatGPT et autres) pour des conversations naturelles et pertinentes.',
            metrics: 'Taux de compréhension de 95%, amélioration continue'
          },
          {
            title: '🌐 Multi-Canal Unifié',
            description: 'Gérez WhatsApp, site web et réseaux sociaux depuis une seule plateforme centralisée.',
            metrics: 'Tous vos canaux de communication en un seul endroit'
          },
          {
            title: '📊 Analytics Puissants',
            description: 'Tableaux de bord complets avec métriques en temps réel, rapports exportables et calcul automatique du ROI.',
            metrics: '20+ métriques suivies, rapports personnalisables'
          },
          {
            title: '🔐 Sécurité & Conformité',
            description: 'Infrastructure sécurisée, conformité RGPD, chiffrement des données et sauvegardes automatiques.',
            metrics: 'Certification de sécurité, 99.9% de disponibilité'
          },
          {
            title: '⚡ Sans Code (No-Code)',
            description: 'Interface intuitive accessible à tous, aucune programmation requise, templates pré-configurés.',
            metrics: 'Création de bot en 10 minutes sans formation technique'
          },
          {
            title: '🔄 Intégrations Flexibles',
            description: 'Connexion facile avec vos outils existants (Google Sheets, CRM, e-commerce) via API et webhooks.',
            metrics: 'API REST complète, webhooks illimités'
          },
          {
            title: '📈 ROI Prouvé',
            description: 'Retour sur investissement mesurable dès le premier mois avec économies significatives sur les coûts opérationnels.',
            metrics: '30-50% de réduction des coûts, +35% de conversions'
          },
          {
            title: '👨‍🏫 Formation & Documentation',
            description: 'Ressources complètes (vidéos, guides, webinaires) pour maîtriser rapidement la plateforme.',
            metrics: '50+ tutoriels vidéo, documentation complète en français'
          }
        ]
      }
    ]
  },
  {
    id: 'pricing',
    title: '💎 Plans & Tarification',
    icon: '💎',
    content: [
      {
        type: 'text',
        content: 'Bot BJ propose 6 packs adaptés à tous les besoins et budgets, du freelance à la grande entreprise.'
      },
      {
        type: 'subsection',
        title: '📦 Pack Découverte (Gratuit)',
        content: 'Parfait pour tester la plateforme et créer votre premier bot.'
      },
      {
        type: 'list',
        items: [
          '1 bot actif',
          '50 conversations/mois',
          'Fonctionnalités de base',
          'Support email',
          'Analytics basiques'
        ]
      },
      {
        type: 'subsection',
        title: '⭐ Pack Essentiel (3 000 FCFA/mois)',
        content: 'Pour les petites entreprises et freelances.'
      },
      {
        type: 'list',
        items: [
          '3 bots actifs',
          '500 conversations/mois',
          'Toutes les fonctionnalités',
          'WhatsApp Business',
          'Support email prioritaire',
          'Analytics complets'
        ]
      },
      {
        type: 'subsection',
        title: '🚀 Pack Professionnel (5 000 FCFA/mois) - POPULAIRE',
        content: 'Le meilleur rapport qualité-prix pour les PME.'
      },
      {
        type: 'list',
        items: [
          '10 bots actifs',
          '2 000 conversations/mois',
          'Automatisations avancées',
          'Intégrations API',
          'Support téléphonique',
          'Formation personnalisée',
          'Export de rapports'
        ]
      },
      {
        type: 'subsection',
        title: '🎨 Pack Automatisation Marketing (7 500 FCFA/mois)',
        content: 'Spécialisé pour les agences et équipes marketing.'
      },
      {
        type: 'list',
        items: [
          'Bots illimités',
          '5 000 conversations/mois',
          'Campagnes automatisées',
          'Création de contenu IA',
          'A/B testing',
          'Intégrations marketing',
          'Account manager dédié'
        ]
      },
      {
        type: 'subsection',
        title: '💬 Pack Service Client (10 000 FCFA/mois)',
        content: 'Pour les entreprises axées sur le support client.'
      },
      {
        type: 'list',
        items: [
          'Bots illimités',
          '10 000 conversations/mois',
          'Multi-utilisateurs (10)',
          'Ticketing avancé',
          'Escalade intelligente',
          'Support prioritaire 24/7',
          'SLA garanti'
        ]
      },
      {
        type: 'subsection',
        title: '💼 Pack Ventes (15 000 FCFA/mois)',
        content: 'Solution complète pour les équipes commerciales.'
      },
      {
        type: 'list',
        items: [
          'Bots illimités',
          'Conversations illimitées',
          'Multi-utilisateurs illimités',
          'CRM intégré',
          'Qualification de leads IA',
          'Prévisions de ventes',
          'Formation équipe incluse',
          'Support dédié VIP'
        ]
      },
      {
        type: 'text',
        content: '🎁 Réduction de 20% sur les abonnements annuels. Essai gratuit de 14 jours sur tous les packs (sans carte bancaire).'
      }
    ]
  },
  {
    id: 'support',
    title: '🤝 Support & Assistance',
    icon: '🤝',
    content: [
      {
        type: 'text',
        content: 'Bot BJ offre plusieurs niveaux de support pour vous accompagner dans l\'utilisation de la plateforme.'
      },
      {
        type: 'subsection',
        title: '📚 Ressources en Libre Accès',
        content: 'Accessibles à tous les utilisateurs, 24/7'
      },
      {
        type: 'list',
        items: [
          'Base de connaissances complète (50+ articles)',
          'Tutoriels vidéo (30+ vidéos)',
          'Documentation technique détaillée',
          'FAQ interactive',
          'Chatbot d\'assistance',
          'Forum communautaire'
        ]
      },
      {
        type: 'subsection',
        title: '📧 Support Email',
        content: 'Inclus à partir du Pack Essentiel'
      },
      {
        type: 'list',
        items: [
          'Réponse sous 24h maximum',
          'Support en français',
          'Pièces jointes acceptées',
          'Email : support@bot.bj'
        ]
      },
      {
        type: 'subsection',
        title: '📞 Support Téléphonique',
        content: 'Inclus à partir du Pack Professionnel'
      },
      {
        type: 'list',
        items: [
          'Appel direct : +229 XX XX XX XX',
          'WhatsApp : +229 XX XX XX XX',
          'Horaires : Lun-Ven 9h-18h (GMT+1)',
          'Samedi : 10h-14h',
          'Réponse immédiate'
        ]
      },
      {
        type: 'subsection',
        title: '⚡ Support Prioritaire VIP',
        content: 'Inclus dans le Pack Ventes'
      },
      {
        type: 'list',
        items: [
          'Account Manager dédié',
          'Support 24/7 y compris weekend',
          'Réponse sous 1h garantie',
          'Formation personnalisée incluse',
          'Revue mensuelle des performances',
          'Ligne directe dédiée',
          'Accès aux bêta features'
        ]
      },
      {
        type: 'subsection',
        title: '🎓 Formation & Onboarding',
        content: 'Pour bien démarrer avec Bot BJ'
      },
      {
        type: 'list',
        items: [
          'Session d\'onboarding offerte (Pack Pro+)',
          'Formation vidéo complète',
          'Webinaires mensuels gratuits',
          'Certification Bot BJ (bientôt)',
          'Documentation de migration',
          'Best practices sectorielles'
        ]
      }
    ]
  },
  {
    id: 'technical',
    title: '⚙️ Spécifications Techniques',
    icon: '⚙️',
    content: [
      {
        type: 'subsection',
        title: '🏗️ Architecture',
        content: 'Plateforme moderne construite sur des technologies éprouvées et scalables.'
      },
      {
        type: 'list',
        title: 'Frontend',
        items: [
          'React 18 avec TypeScript pour la fiabilité',
          'Tailwind CSS pour le design responsive',
          'Vite pour des performances optimales',
          'Progressive Web App (PWA) compatible',
          'Interface utilisateur intuitive et moderne'
        ]
      },
      {
        type: 'list',
        title: 'Backend',
        items: [
          'Supabase (PostgreSQL) pour la base de données',
          'Edge Functions pour la logique métier',
          'Real-time subscriptions pour les mises à jour live',
          'Row Level Security (RLS) pour la sécurité',
          'API RESTful complète',
          'Webhooks pour les intégrations'
        ]
      },
      {
        type: 'list',
        title: 'Intelligence Artificielle',
        items: [
          'Intégration ChatGPT (GPT-4)',
          'Modèles IA personnalisables',
          'NLP avancé pour la compréhension',
          'Apprentissage continu',
          'Analyse de sentiment',
          'Détection d\'intention'
        ]
      },
      {
        type: 'list',
        title: 'Sécurité',
        items: [
          'Chiffrement AES-256',
          'HTTPS obligatoire',
          'Authentification multi-facteurs (2FA)',
          'Protection XSS et CSRF',
          'Conformité RGPD',
          'Sauvegardes quotidiennes automatiques',
          'Isolation des données par client'
        ]
      },
      {
        type: 'list',
        title: 'Performance',
        items: [
          'CDN global pour des temps de chargement rapides',
          'Cache intelligent',
          'Lazy loading des ressources',
          'Optimisation des images (WebP)',
          'Code splitting',
          'Score Lighthouse > 90/100'
        ]
      },
      {
        type: 'list',
        title: 'Disponibilité',
        items: [
          'Uptime 99.9% garanti',
          'Infrastructure redondante',
          'Monitoring 24/7',
          'Alertes automatiques',
          'Plan de reprise d\'activité (PRA)',
          'Maintenance sans interruption de service'
        ]
      },
      {
        type: 'list',
        title: 'API & Intégrations',
        items: [
          'API REST complète et documentée',
          'Webhooks illimités',
          'OAuth 2.0 pour l\'authentification',
          'Rate limiting configurables',
          'Environnement sandbox de test',
          'SDKs en JavaScript, Python, PHP'
        ]
      }
    ]
  },
  {
    id: 'roadmap',
    title: '🗺️ Feuille de Route',
    icon: '🗺️',
    content: [
      {
        type: 'text',
        content: 'Bot BJ évolue constamment pour répondre aux besoins de ses utilisateurs. Voici nos priorités de développement.'
      },
      {
        type: 'subsection',
        title: '✅ Actuellement Disponible',
        content: 'Fonctionnalités opérationnelles aujourd\'hui'
      },
      {
        type: 'list',
        items: [
          'Gestion complète des bots IA',
          'Intégration WhatsApp Business',
          'Automatisations et workflows',
          'Analytics et reporting',
          'Support multi-utilisateurs',
          'Paiements Mobile Money',
          'Widget web intégrable',
          'API REST et webhooks'
        ]
      },
      {
        type: 'subsection',
        title: '🚀 Prochainement (T1 2025)',
        content: 'En cours de développement'
      },
      {
        type: 'list',
        items: [
          'Intégration Instagram Direct',
          'Intégration Facebook Messenger',
          'Application mobile (iOS & Android)',
          'Marketplace de templates',
          'Intégration Shopify/WooCommerce',
          'Bot vocal (appels téléphoniques)',
          'Traduction automatique multilingue'
        ]
      },
      {
        type: 'subsection',
        title: '🔮 Futur (2025-2026)',
        content: 'Vision à moyen terme'
      },
      {
        type: 'list',
        items: [
          'Intégrations CRM (Salesforce, HubSpot)',
          'IA prédictive pour les ventes',
          'Chatbot vidéo avec avatar virtuel',
          'Marketplace d\'extensions',
          'Programme de partenaires et affiliés',
          'Certification Bot BJ',
          'Version White Label pour agences',
          'Expansion dans toute l\'Afrique'
        ]
      }
    ]
  },
  {
    id: 'faq',
    title: '❓ Questions Fréquentes',
    icon: '❓',
    content: [
      {
        type: 'subsection',
        title: 'Comment créer mon premier bot ?',
        content: 'Inscrivez-vous sur Bot.bj, accédez à "Gestion des Bots", cliquez sur "Nouveau Bot", nommez-le, définissez sa personnalité et configurez ses réponses de base. Votre bot sera opérationnel en 10 minutes.'
      },
      {
        type: 'subsection',
        title: 'Ai-je besoin de compétences techniques ?',
        content: 'Non, Bot BJ est une plateforme no-code. Aucune compétence en programmation n\'est requise. L\'interface est intuitive et des tutoriels vous guident pas à pas.'
      },
      {
        type: 'subsection',
        title: 'Comment connecter WhatsApp Business ?',
        content: 'Accédez à "WhatsApp Connect", scannez le QR Code avec votre application WhatsApp Business, validez la connexion. C\'est prêt en 2 minutes.'
      },
      {
        type: 'subsection',
        title: 'Quels modes de paiement acceptez-vous ?',
        content: 'Nous acceptons Mobile Money (MTN Money, Moov Money), cartes bancaires (Visa, Mastercard) et virements bancaires. Les paiements sont sécurisés et instantanés.'
      },
      {
        type: 'subsection',
        title: 'Puis-je changer de pack à tout moment ?',
        content: 'Oui, vous pouvez upgrader ou downgrader votre pack à tout moment depuis votre tableau de bord. Les changements sont effectifs immédiatement.'
      },
      {
        type: 'subsection',
        title: 'Mes données sont-elles sécurisées ?',
        content: 'Absolument. Vos données sont chiffrées (AES-256), stockées sur des serveurs sécurisés, sauvegardées quotidiennement et conformes au RGPD. Vous gardez le contrôle total.'
      },
      {
        type: 'subsection',
        title: 'Le support est-il inclus ?',
        content: 'Oui, tous les packs incluent un accès au support. Le niveau varie selon le pack : email (Essentiel+), téléphone (Pro+), prioritaire VIP (Ventes).'
      },
      {
        type: 'subsection',
        title: 'Puis-je avoir plusieurs bots ?',
        content: 'Oui, selon votre pack : 1 bot (Découverte), 3 bots (Essentiel), 10 bots (Pro), illimités (Automatisation Marketing, Service Client, Ventes).'
      },
      {
        type: 'subsection',
        title: 'Comment fonctionne l\'essai gratuit ?',
        content: 'Essai de 14 jours sur tous les packs payants, sans carte bancaire requise. Annulation possible à tout moment. Toutes les fonctionnalités sont accessibles.'
      },
      {
        type: 'subsection',
        title: 'Puis-je intégrer Bot BJ à mon site web ?',
        content: 'Oui, générez le widget depuis votre tableau de bord, personnalisez son apparence et intégrez le code sur votre site en 1 minute. Compatible avec tous les CMS.'
      },
      {
        type: 'subsection',
        title: 'Combien de langues sont supportées ?',
        content: 'Actuellement, l\'interface est en français et les bots peuvent converser en français et anglais. D\'autres langues africaines sont prévues en 2025.'
      },
      {
        type: 'subsection',
        title: 'Quel est le ROI typique ?',
        content: 'Nos clients constatent en moyenne : -30-50% de coûts opérationnels, +35% de conversions, +40% de satisfaction client. Le ROI est positif dès le premier mois pour la majorité.'
      }
    ]
  },
  {
    id: 'getting-started',
    title: '🚀 Démarrage Rapide',
    icon: '🚀',
    content: [
      {
        type: 'text',
        content: 'Lancez-vous avec Bot BJ en 4 étapes simples et soyez opérationnel en moins de 24 heures.'
      },
      {
        type: 'subsection',
        title: 'Étape 1 : Créer votre compte (5 minutes)',
        content: 'Inscrivez-vous avec votre email ou votre compte Google. Vérifiez votre email, configurez votre profil et choisissez votre pack (essai gratuit disponible).'
      },
      {
        type: 'subsection',
        title: 'Étape 2 : Créer votre premier bot (10 minutes)',
        content: 'Accédez à "Gestion des Bots", créez un nouveau bot, nommez-le, définissez sa personnalité (ton, style de réponse), configurez les réponses de base et testez-le en temps réel.'
      },
      {
        type: 'subsection',
        title: 'Étape 3 : Connecter vos canaux (15 minutes)',
        content: 'Connectez WhatsApp Business via QR Code, intégrez le widget sur votre site web, configurez vos automatisations de base et définissez vos workflows.'
      },
      {
        type: 'subsection',
        title: 'Étape 4 : Lancer et optimiser (ongoing)',
        content: 'Activez votre bot, surveillez les performances sur le dashboard, analysez les conversations, ajustez les réponses et enrichissez continuellement la base de connaissances.'
      },
      {
        type: 'text',
        content: '🎓 Besoin d\'aide ? Consultez nos tutoriels vidéo, notre documentation complète ou contactez notre support. Une session d\'onboarding personnalisée est offerte avec les packs Pro et supérieurs.'
      },
      {
        type: 'text',
        content: '✨ Conseil : Commencez simple avec quelques réponses de base, puis enrichissez progressivement votre bot au fil des conversations. L\'amélioration continue est la clé du succès.'
      }
    ]
  }
];

export const getDocumentationSection = (id: string): PlatformSection | undefined => {
  return platformDocumentation.find(section => section.id === id);
};

export const getAllSectionIds = (): string[] => {
  return platformDocumentation.map(section => section.id);
};
