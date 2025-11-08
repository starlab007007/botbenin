export interface DetailedModule {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  benefits: string[];
  useCases: string[];
  pricing: string;
  workflow: string;
  faq: Array<{ question: string; answer: string }>;
}

export const detailedModules: DetailedModule[] = [
  {
    id: 'ia-business',
    icon: '💼',
    title: 'IA Business (Agent B2B)',
    description: 'Module complet pour automatiser la prospection B2B, enrichir les données prospects et gérer intelligemment votre pipeline commercial.',
    features: [
      'Recherche B2B intelligente avec critères avancés (secteur, localisation, taille)',
      'Scoring automatique des leads (0-100)',
      'Import intelligent de prospects (OCR, Excel, CSV, LinkedIn)',
      'Enrichissement automatique des données (email, téléphone, social media)',
      'Campagnes d\'engagement multi-canaux (Email + WhatsApp)',
      'Bases de connaissances sectorielles (8 secteurs pré-configurés)',
      'Visualisation cartographique interactive des prospects',
      'Génération de rapports Pre-Call en 2 minutes',
      'CRM intégré avec pipeline personnalisable',
      'Analytics avancées et rapports automatisés'
    ],
    benefits: [
      'Gain de temps : 95% sur la recherche de prospects (2 min vs 2-3h)',
      'Taux de conversion : +40% grâce à une meilleure préparation',
      'Productivité commerciale : x2.6 (plus de temps à vendre)',
      'Coût par lead : -65% comparé aux méthodes traditionnelles',
      'Qualification : 90% de précision du scoring automatique',
      'Scalabilité : gérez 10x plus de prospects sans embaucher'
    ],
    useCases: [
      '🏢 PME cherchant de nouveaux clients B2B dans leur région',
      '📱 Startups SaaS ciblant des entreprises spécifiques',
      '🏗️ Entreprises de services (consulting, marketing, IT) prospectant',
      '🏭 Distributeurs cherchant des revendeurs ou partenaires',
      '💼 Commerciaux indépendants optimisant leur prospection',
      '🎯 Agences de communication ciblant des secteurs précis'
    ],
    pricing: 'Inclus dans pack Professionnel (5 000 FCFA/mois) et Ventes (15 000 FCFA/mois)',
    workflow: `graph TD
    A[Définir Critères] --> B[Lancement Recherche IA]
    B --> C[Collecte Multi-Sources]
    C --> D[Scoring Automatique]
    D --> E[Enrichissement Données]
    E --> F[Rapport Pre-Call]
    F --> G[Campagne Engagement]
    G --> H[Suivi & Qualification]
    H --> I[Transfert Commercial]`,
    faq: [
      {
        question: 'Comment fonctionne le scoring des leads ?',
        answer: 'Notre IA analyse 15+ critères (taille entreprise, secteur, activité récente, présence digitale, engagement) et attribue un score de 0 à 100. Les leads >70 sont considérés comme chauds.'
      },
      {
        question: 'D\'où proviennent les données ?',
        answer: 'Nous collectons des données publiques depuis LinkedIn, sites web d\'entreprises, annuaires professionnels, réseaux sociaux et bases de données officielles (RCCM, etc.).'
      },
      {
        question: 'Combien de prospects puis-je trouver ?',
        answer: 'Pack Pro: 1000 recherches/mois, Pack Ventes: illimité. En moyenne, une recherche retourne 50-200 prospects qualifiés selon vos critères.'
      },
      {
        question: 'Les données sont-elles à jour ?',
        answer: 'Oui, les données sont collectées en temps réel lors de chaque recherche. Nous vérifions aussi la validité des emails et numéros de téléphone.'
      },
      {
        question: 'Puis-je exporter les prospects ?',
        answer: 'Oui, export en Excel, CSV ou import direct dans votre CRM (Salesforce, HubSpot, Pipedrive compatibles).'
      }
    ]
  },
  {
    id: 'ia-visual-creator',
    icon: '🎨',
    title: 'IA Créateur Visuel',
    description: 'Générez des visuels professionnels pour vos réseaux sociaux en 30 secondes grâce à l\'intelligence artificielle.',
    features: [
      'Génération d\'images IA en haute résolution (jusqu\'à 4K)',
      '4 formats optimisés (Instagram Post, Stories, Facebook, TikTok)',
      '6 styles visuels (Moderne, Élégant, Coloré, Minimaliste, Vintage, Corporate)',
      'Générateur de flyers professionnels par secteur',
      'AI Videography (vidéos promotionnelles automatiques)',
      'Galerie personnelle avec historique des créations',
      'Templates sectoriels pré-designés',
      'Personnalisation du branding (logo, couleurs, polices)',
      'Export multi-formats (PNG, JPG, WebP)',
      'Planification et publication automatique (à venir)'
    ],
    benefits: [
      'Économies : -80 à -95% vs graphiste (45 000 FCFA/mois économisés)',
      'Vitesse : x100 plus rapide (30 sec vs 24-48h)',
      'Volume : x10 plus de créations produites',
      'Tests A/B : testez plusieurs versions instantanément',
      'Cohérence : branding uniforme automatique',
      'Scalabilité : production illimitée (pack Pro)'
    ],
    useCases: [
      '📱 E-commerces publiant quotidiennement sur les réseaux',
      '🎯 Agences marketing gérant plusieurs clients',
      '🏨 Hôtels promouvant offres et événements',
      '🎓 Écoles communiquant sur formations et événements',
      '🍕 Restaurants partageant menus et promotions',
      '💼 Startups sans budget design'
    ],
    pricing: 'Pack Pro: 50 créations/mois (5 000 FCFA), Pack Ventes: illimité (15 000 FCFA)',
    workflow: `graph TD
    A[Choisir Format] --> B[Sélectionner Style]
    B --> C[Entrer Description]
    C --> D[Génération IA 30 sec]
    D --> E[Prévisualisation]
    E --> F{Satisfait?}
    F -->|Non| G[Régénérer]
    G --> D
    F -->|Oui| H[Télécharger HD]
    H --> I[Publication]`,
    faq: [
      {
        question: 'Les images sont-elles libres de droits ?',
        answer: 'Oui, toutes les images générées vous appartiennent à 100% et peuvent être utilisées commercialement sans restriction.'
      },
      {
        question: 'Puis-je demander des modifications ?',
        answer: 'Vous pouvez régénérer autant de fois que nécessaire en ajustant votre description. Chaque génération compte pour 1 création.'
      },
      {
        question: 'Quelle est la qualité des images ?',
        answer: 'Résolution jusqu\'à 2048x2048px (4K), optimale pour impression et réseaux sociaux. Format haute qualité sans perte.'
      },
      {
        question: 'Comment ajouter mon logo ?',
        answer: 'Uploadez votre logo dans les paramètres. Il sera automatiquement ajouté à toutes vos créations avec positionnement intelligent.'
      },
      {
        question: 'Y a-t-il des limites de style ?',
        answer: 'Les 6 styles sont optimisés pour le marketing. Vous pouvez aussi décrire un style personnalisé dans votre prompt.'
      }
    ]
  },
  {
    id: 'ia-precall-report',
    icon: '📊',
    title: 'IA Rapport Pre-Call',
    description: 'Préparez vos rendez-vous commerciaux en 2 minutes avec un rapport d\'intelligence enrichi automatiquement.',
    features: [
      'Enrichissement automatique depuis 10+ sources (LinkedIn, web, actualités)',
      'Génération de rapport PDF structuré et professionnel',
      'Informations clés : photo, poste, entreprise, parcours',
      'Actualités récentes du prospect et de son entreprise',
      'Analyse des besoins et opportunités potentielles',
      'Points de discussion personnalisés suggérés',
      'Stratégie d\'approche recommandée par l\'IA',
      'Détection d\'événements déclencheurs (projets, embauches, funding)',
      'Historique des interactions précédentes',
      'Score de préparation du rendez-vous'
    ],
    benefits: [
      'Temps gagné : 95% (2 min vs 2-3h de recherche manuelle)',
      'Taux de conversion : +40% grâce à une meilleure préparation',
      'Professionnalisme : impression renforcée auprès du prospect',
      'Confiance : arrivez préparé et informé',
      'Efficacité : concentrez-vous sur la vente, pas la recherche',
      'ROI : 1 vente supplémentaire rembourse l\'année'
    ],
    useCases: [
      '💼 Commerciaux B2B préparant leurs rendez-vous',
      '🤝 Business developers ciblant des partenariats',
      '📈 Account managers gérant des comptes stratégiques',
      '🎯 Chasseurs de têtes rencontrant des candidats',
      '💰 Leveurs de fonds pitchant des investisseurs',
      '🏢 Consultants préparant des audits clients'
    ],
    pricing: 'Pack Pro: 10 rapports/mois (5 000 FCFA), Pack Ventes: illimité (15 000 FCFA)',
    workflow: `graph TD
    A[Entrer Nom/Entreprise] --> B[Recherche Multi-Sources]
    B --> C[Extraction Données]
    C --> D[Analyse IA]
    D --> E[Génération Rapport]
    E --> F[Points Discussion]
    F --> G[Stratégie Approche]
    G --> H[Export PDF]
    H --> I[Rendez-vous Préparé]`,
    faq: [
      {
        question: 'Quelles sources sont utilisées ?',
        answer: 'LinkedIn, sites web d\'entreprises, Google News, Twitter/X, bases de données professionnelles, communiqués de presse, et registres officiels.'
      },
      {
        question: 'Combien de temps prend la génération ?',
        answer: 'En moyenne 90-120 secondes pour un rapport complet de 5-8 pages. Dépend de la disponibilité des données publiques.'
      },
      {
        question: 'Les données sont-elles légales ?',
        answer: 'Oui, nous collectons uniquement des données publiques disponibles en ligne, en conformité avec le RGPD et les lois sur la protection des données.'
      },
      {
        question: 'Puis-je personnaliser le rapport ?',
        answer: 'Oui, ajoutez vos propres notes, modifiez les sections, et customisez le template avec votre branding.'
      },
      {
        question: 'Que faire si les données sont incomplètes ?',
        answer: 'Le rapport indique clairement les informations manquantes. Vous pouvez compléter manuellement ou relancer la recherche avec d\'autres critères.'
      }
    ]
  },
  {
    id: 'whatsapp-connect',
    icon: '💬',
    title: 'WhatsApp Connect',
    description: 'Transformez votre WhatsApp Business en machine de vente automatisée avec notre intégration native.',
    features: [
      'Connexion en 1 clic via QR Code (30 secondes)',
      'Bot IA conversationnel 24/7 en français',
      'Réponses automatiques contextuelles intelligentes',
      'Gestion multi-comptes WhatsApp Business',
      'Envoi de messages groupés (jusqu\'à 10 000/jour)',
      'Templates WhatsApp Business pré-approuvés',
      'Catalogues produits intégrés avec paiement',
      'Boutons d\'action rapide (CTA, liens, etc.)',
      'Support médias (images, vidéos, documents, audio)',
      'Analytics détaillées (ouverture, réponse, conversion)',
      'Transfert intelligent vers agent humain',
      'Campagnes WhatsApp segmentées'
    ],
    benefits: [
      'Taux d\'ouverture : 95% (vs 20% email)',
      'Conversions : 3x supérieures aux autres canaux',
      'Disponibilité : 24/7 sans recruter',
      'Économies : 47 000 FCFA/mois vs agent dédié',
      'Scalabilité : gérez 1000+ conversations simultanées',
      'Engagement : canal préféré en Afrique (85% utilisateurs)'
    ],
    useCases: [
      '🛒 E-commerces confirmant et suivant les commandes',
      '🏨 Hôtels gérant les réservations 24/7',
      '📚 Écoles communiquant avec parents et étudiants',
      '🏥 Cliniques prenant rendez-vous médicaux',
      '🚕 Services de livraison notifiant les clients',
      '💼 Entreprises de service supportant leurs clients'
    ],
    pricing: 'Tous les packs (dès 3 000 FCFA/mois). Conversations illimitées.',
    workflow: `graph TD
    A[Scanner QR Code] --> B[Connexion WhatsApp]
    B --> C[Configuration Bot]
    C --> D[Messages Automatiques]
    D --> E{Client écrit}
    E --> F[Bot Répond IA]
    F --> G{Résolu?}
    G -->|Oui| H[Conversation Terminée]
    G -->|Non| I[Transfert Humain]
    I --> J[Agent Prend Relais]`,
    faq: [
      {
        question: 'Est-ce conforme aux conditions WhatsApp ?',
        answer: 'Oui, nous utilisons l\'API officielle WhatsApp Business. Votre compte est 100% conforme et protégé contre les bannissements.'
      },
      {
        question: 'Puis-je utiliser mon numéro actuel ?',
        answer: 'Oui, si vous avez WhatsApp Business. Pour WhatsApp classique, nous pouvons vous aider à migrer sans perdre vos contacts.'
      },
      {
        question: 'Combien de messages puis-je envoyer ?',
        answer: 'Réponses aux clients: illimitées. Messages initiés: jusqu\'à 10 000/jour selon votre abonnement WhatsApp Business.'
      },
      {
        question: 'Le bot peut-il envoyer des images/vidéos ?',
        answer: 'Oui, le bot peut envoyer tous types de médias (images, vidéos, documents, audio, localisation, contacts).'
      },
      {
        question: 'Comment se passe le transfert à un humain ?',
        answer: 'Automatique si le bot ne peut pas répondre, ou manuel sur demande du client. L\'agent voit tout l\'historique de la conversation.'
      }
    ]
  },
  {
    id: 'bot-management',
    icon: '🤖',
    title: 'Gestion des Bots',
    description: 'Créez, configurez et gérez tous vos assistants virtuels depuis une interface centralisée sans code.',
    features: [
      'Création de bots en 10 minutes sans code',
      'Templates pré-configurés par secteur (8 secteurs)',
      'Personnalisation complète de la personnalité',
      'Formation avec vos propres documents (PDF, Word, Excel)',
      'Tests en temps réel avant déploiement',
      'Versioning et rollback des configurations',
      'Clone de bots existants',
      'Multi-langue (français, anglais, + autres)',
      'Import/Export de configurations',
      'Statistiques par bot individuelles'
    ],
    benefits: [
      'Déploiement : 10 minutes vs 2-4 semaines classique',
      'Précision : 95% dès le départ avec templates sectoriels',
      'Économie : 0 FCFA développeur (vs 500k - 2M FCFA)',
      'Flexibilité : modifications en temps réel sans redéploiement',
      'Scalabilité : créez autant de bots que nécessaire',
      'Autonomie : aucune dépendance technique'
    ],
    useCases: [
      '🏨 Bot de réservation hôtelière 24/7',
      '🛒 Bot e-commerce avec catalogue produits',
      '🎓 Bot orientation étudiants',
      '💼 Bot qualification leads B2B',
      '🏥 Bot prise de rendez-vous médical',
      '📞 Bot support client multi-niveaux'
    ],
    pricing: 'Tous les packs. Nombre de bots selon pack : 1 (Gratuit), 3 (Essentiel), 10 (Pro), Illimité (Ventes)',
    workflow: `graph TD
    A[Nouveau Bot] --> B[Choisir Template Secteur]
    B --> C[Nommer et Décrire]
    C --> D[Définir Personnalité]
    D --> E[Importer Documents]
    E --> F[Configuration Réponses]
    F --> G[Tests Interactifs]
    G --> H{Satisfait?}
    H -->|Non| I[Ajustements]
    I --> G
    H -->|Oui| J[Déploiement]
    J --> K[Monitoring Live]`,
    faq: [
      {
        question: 'Combien de temps pour créer un bot ?',
        answer: 'Avec nos templates sectoriels : 10 minutes. De zéro : 30-45 minutes. La formation continue améliore automatiquement le bot au fil du temps.'
      },
      {
        question: 'Puis-je former le bot avec mes documents ?',
        answer: 'Oui ! Uploadez PDF, Word, Excel, PowerPoint, CSV. Le bot analyse et apprend automatiquement. Capacité : 100 documents par bot (Pro), illimité (Ventes).'
      },
      {
        question: 'Comment personnaliser la personnalité ?',
        answer: 'Définissez le ton (formel/décontracté), le style (professionnel/amical), la verbosité (concis/détaillé) et des phrases types. L\'IA adapte automatiquement.'
      },
      {
        question: 'Puis-je avoir plusieurs bots pour différents services ?',
        answer: 'Oui ! Créez un bot par service (ventes, support, RH, etc.) et routez intelligemment les conversations selon le besoin.'
      },
      {
        question: 'Comment tester avant de déployer ?',
        answer: 'Interface de test intégrée avec simulateur de conversations. Testez tous les scénarios, ajustez en temps réel, puis déployez en 1 clic.'
      }
    ]
  },
  {
    id: 'automations',
    icon: '🔄',
    title: 'Automatisations & Workflows',
    description: 'Créez des scénarios d\'automatisation complexes pour connecter vos outils et automatiser vos processus métier.',
    features: [
      'Éditeur visuel de workflows (drag & drop)',
      'Bibliothèque de 50+ workflows pré-configurés',
      'Déclencheurs multiples (mots-clés, horaires, événements)',
      'Actions conditionnelles avancées (if/then/else)',
      'Intégrations 400+ services (Google, CRM, Email, etc.)',
      'Webhooks illimités pour connexions API',
      'Planification de tâches récurrentes',
      'Envoi de notifications multi-canaux',
      'Escalade automatique vers humains',
      'Logs détaillés et monitoring'
    ],
    benefits: [
      'Productivité : +300% sur tâches répétitives',
      'Erreurs : -98% grâce à l\'automatisation',
      'Temps gagné : 20-30h/semaine par employé',
      'Coûts : -40% sur opérations manuelles',
      'Disponibilité : workflows 24/7 sans intervention',
      'Scalabilité : gérez 10x plus de volume'
    ],
    useCases: [
      '📧 Relances automatiques prospects inactifs',
      '📅 Rappels de rendez-vous WhatsApp',
      '✉️ Envoi de devis personnalisés',
      '📊 Rapports quotidiens automatiques',
      '🎯 Qualification et routing de leads',
      '💳 Notifications de paiement'
    ],
    pricing: 'Pack Pro+ (5 000 FCFA/mois). Workflows illimités (Ventes)',
    workflow: `graph TD
    A[Définir Déclencheur] --> B{Type?}
    B -->|Mot-clé| C[Config Mot-clé]
    B -->|Horaire| D[Config Planning]
    B -->|Événement| E[Config Webhook]
    C --> F[Ajouter Actions]
    D --> F
    E --> F
    F --> G[Conditions if/then]
    G --> H[Actions Multiples]
    H --> I[Test Workflow]
    I --> J{Fonctionne?}
    J -->|Non| K[Debug]
    K --> I
    J -->|Oui| L[Activer]
    L --> M[Monitoring]`,
    faq: [
      {
        question: 'C\'est compliqué de créer un workflow ?',
        answer: 'Non ! Interface visuelle drag & drop comme un diagramme. Pas de code. Utilisez nos 50+ templates pour démarrer en 5 minutes.'
      },
      {
        question: 'Puis-je connecter mes outils existants ?',
        answer: 'Oui ! 400+ intégrations natives (Google Sheets, Gmail, Slack, CRM, etc.) + webhooks pour n\'importe quelle API.'
      },
      {
        question: 'Combien de workflows puis-je créer ?',
        answer: 'Pack Pro : 20 workflows actifs. Pack Ventes : illimités. Chaque workflow peut avoir des actions illimitées.'
      },
      {
        question: 'Les workflows fonctionnent même la nuit ?',
        answer: 'Oui, 24/7/365. Nos serveurs exécutent vos workflows automatiquement même quand vous dormez.'
      },
      {
        question: 'Comment débugger un workflow qui ne marche pas ?',
        answer: 'Logs détaillés de chaque exécution. Voyez exactement où ça bloque. Mode test pour simuler sans impacter la production.'
      }
    ]
  },
  {
    id: 'crm-prospects',
    icon: '👥',
    title: 'CRM & Gestion Prospects',
    description: 'CRM complet pour gérer votre pipeline commercial, suivre vos prospects et optimiser vos ventes.',
    features: [
      'Pipeline visuel personnalisable (drag & drop)',
      'Import de prospects (Excel, CSV, LinkedIn, OCR)',
      'Fiches prospects enrichies automatiquement',
      'Historique complet des interactions',
      'Scoring automatique des leads',
      'Segmentation et filtres avancés',
      'Tâches et rappels automatiques',
      'Prévisions de ventes IA',
      'Rapports commerciaux détaillés',
      'Export données (Excel, PDF)'
    ],
    benefits: [
      'Taux de conversion : +35% grâce au suivi',
      'Temps de vente : -50% avec automatisation',
      'Leads perdus : -80% avec rappels auto',
      'Visibilité : pipeline en temps réel',
      'Prévisions : précision 90% grâce à l\'IA',
      'Collaboration : équipe synchronisée'
    ],
    useCases: [
      '💼 Suivi complet pipeline B2B',
      '🎯 Qualification automatique leads',
      '📞 Planning appels commerciaux',
      '📊 Reporting direction mensuel',
      '🤝 Gestion partenariats',
      '💰 Prévisions de ventes trimestrielles'
    ],
    pricing: 'Pack Ventes (15 000 FCFA/mois). Prospects illimités, utilisateurs illimités',
    workflow: `graph TD
    A[Nouveau Prospect] --> B[Import/Saisie]
    B --> C[Enrichissement Auto]
    C --> D[Scoring IA]
    D --> E{Score?}
    E -->|>70| F[Lead Chaud]
    E -->|40-70| G[Lead Tiède]
    E -->|<40| H[Lead Froid]
    F --> I[Action Immédiate]
    G --> J[Nurturing]
    H --> K[Veille]
    I --> L[Qualification]
    L --> M[Opportunité]
    M --> N[Négociation]
    N --> O[Vente Gagnée]`,
    faq: [
      {
        question: 'Comment importer mes prospects existants ?',
        answer: 'Import Excel/CSV en 1 clic. Mapping automatique des colonnes. Import LinkedIn Chrome extension. OCR de cartes de visite.'
      },
      {
        question: 'Le CRM remplace-t-il Salesforce ?',
        answer: 'Pour PME, oui ! Si vous utilisez Salesforce, notre CRM s\'intègre via API pour synchroniser les données dans les deux sens.'
      },
      {
        question: 'Comment fonctionne le scoring automatique ?',
        answer: 'L\'IA analyse 15+ critères (engagement, taille entreprise, budget, timing, etc.) et attribue un score 0-100. Mis à jour en temps réel.'
      },
      {
        question: 'Puis-je personnaliser mon pipeline ?',
        answer: 'Totalement ! Créez vos propres étapes, définissez les critères de passage, personnalisez les champs. Drag & drop pour réorganiser.'
      },
      {
        question: 'Comment partager avec mon équipe ?',
        answer: 'Ajoutez des utilisateurs, définissez leurs rôles (Admin, Manager, Commercial). Chacun voit ses prospects + ceux de son équipe.'
      }
    ]
  },
  {
    id: 'video-production',
    icon: '🎬',
    title: 'Production Vidéo IA',
    description: 'Créez des vidéos promotionnelles professionnelles en quelques minutes grâce à l\'intelligence artificielle.',
    features: [
      'Génération de vidéos IA (30 sec - 3 min)',
      'Templates par secteur (10+ styles)',
      'Scripts générés automatiquement',
      'Voix off IA multilingue (20+ langues)',
      'Musiques libres de droits intégrées',
      'Sous-titres automatiques',
      'Transitions et effets professionnels',
      'Personnalisation branding (logo, couleurs)',
      'Export HD (1080p, 4K)',
      'Planification publications sociales'
    ],
    benefits: [
      'Coût : -95% vs production traditionnelle',
      'Temps : 5 min vs 2-5 jours',
      'Volume : créez 10x plus de contenus',
      'Engagement : +280% vs posts images',
      'ROI : 1 vidéo = 10-20 posts textes',
      'Accessibilité : tout le monde peut créer'
    ],
    useCases: [
      '📱 Vidéos réseaux sociaux (Instagram, TikTok, Facebook)',
      '🛒 Présentation produits e-commerce',
      '🎓 Vidéos de formation et tutoriels',
      '💼 Pitch deck vidéo pour investisseurs',
      '🏨 Visites virtuelles hôtels/restaurants',
      '📢 Publicités vidéo ciblées'
    ],
    pricing: 'Pack Automatisation Marketing (7 500 FCFA/mois) : 10 vidéos/mois. Pack Ventes : 50 vidéos/mois',
    workflow: `graph TD
    A[Choisir Template] --> B[Écrire Script]
    B --> C[IA Génère Storyboard]
    C --> D[Sélection Voix/Musique]
    D --> E[Génération Vidéo]
    E --> F[Prévisualisation]
    F --> G{Satisfait?}
    G -->|Non| H[Ajustements]
    H --> E
    G -->|Oui| I[Export HD]
    I --> J[Publication Automatique]`,
    faq: [
      {
        question: 'Les vidéos sont-elles vraiment créées par IA ?',
        answer: 'Oui ! Script, images, animations, voix, musique, tout est généré automatiquement. Vous guidez le style et le message.'
      },
      {
        question: 'Quelle est la qualité des vidéos ?',
        answer: 'Qualité professionnelle en 1080p (Full HD) ou 4K. Niveau production agence. Personne ne verra la différence.'
      },
      {
        question: 'Puis-je utiliser ma propre voix ?',
        answer: 'Oui ! Uploadez un enregistrement ou utilisez nos 20+ voix IA (homme/femme, différents accents). Clone de voix disponible (Ventes).'
      },
      {
        question: 'Les vidéos sont-elles libres de droits ?',
        answer: 'Oui, 100% ! Toutes les musiques, images, voix sont libres de droits. Utilisez commercialement sans limite.'
      },
      {
        question: 'Combien de temps pour créer une vidéo ?',
        answer: 'Génération : 2-5 minutes selon la longueur. Personnalisation : 5-10 minutes. Total : 10-15 min pour une vidéo HD complète.'
      }
    ]
  },
  {
    id: 'marketing-gallery',
    icon: '🎨',
    title: 'Galerie Marketing',
    description: 'Bibliothèque centralisée de tous vos contenus marketing avec organisation intelligente et partage facile.',
    features: [
      'Stockage illimité de créations',
      'Organisation par campagnes/projets',
      'Tags et catégories personnalisés',
      'Recherche intelligente par mots-clés',
      'Filtres avancés (date, type, format)',
      'Prévisualisation instantanée',
      'Partage direct réseaux sociaux',
      'Génération de liens de partage',
      'Historique des versions',
      'Statistiques de performance'
    ],
    benefits: [
      'Organisation : trouvez n\'importe quel visuel en <5 sec',
      'Productivité : -70% temps de recherche',
      'Collaboration : partagez facilement avec équipe/clients',
      'Réutilisation : identifiez top performers',
      'Cohérence : branding uniforme centralisé',
      'Sécurité : sauvegardes automatiques'
    ],
    useCases: [
      '📊 Portfolio agence marketing',
      '🛍️ Bibliothèque produits e-commerce',
      '📱 Archives campagnes réseaux sociaux',
      '🎯 Assets marketing multiples clients',
      '📸 Banque d\'images entreprise',
      '🎨 Templates réutilisables'
    ],
    pricing: 'Tous les packs (stockage selon pack : 1GB gratuit, 10GB Pro, 100GB Ventes, illimité Entreprise)',
    workflow: `graph TD
    A[Création/Upload] --> B[Tag & Catégorisation]
    B --> C[Stockage Galerie]
    C --> D{Action?}
    D -->|Recherche| E[Filtres/Tags]
    D -->|Partage| F[Lien/Social]
    D -->|Modification| G[Édition]
    E --> H[Aperçu]
    F --> I[Publication]
    G --> J[Nouvelle Version]
    J --> C`,
    faq: [
      {
        question: 'Combien d\'espace de stockage ai-je ?',
        answer: 'Gratuit : 1GB, Essentiel : 5GB, Pro : 10GB, Ventes : 100GB, Entreprise : illimité. 1GB = ~1000 images HD.'
      },
      {
        question: 'Puis-je partager ma galerie avec des clients ?',
        answer: 'Oui ! Créez des galeries privées avec liens sécurisés. Définissez les permissions (vue seule, téléchargement, commentaires).'
      },
      {
        question: 'Les anciennes versions sont-elles conservées ?',
        answer: 'Oui, historique complet des versions. Restaurez n\'importe quelle version précédente en 1 clic.'
      },
      {
        question: 'Comment organiser par campagne ?',
        answer: 'Créez des dossiers/projets, ajoutez des tags, définissez des catégories. Organisation flexible selon votre workflow.'
      },
      {
        question: 'Puis-je publier directement sur les réseaux sociaux ?',
        answer: 'Oui ! Connexion Instagram, Facebook, LinkedIn. Publication immédiate ou programmée depuis la galerie.'
      }
    ]
  },
  {
    id: 'ia-gestion',
    icon: '📋',
    title: 'IA Gestion RH & Opérations',
    description: 'Automatisez vos processus RH, gestion de projets et opérations internes avec l\'intelligence artificielle.',
    features: [
      'Gestion des congés et absences',
      'Suivi du temps et présences',
      'Évaluations de performance automatisées',
      'Recrutement et onboarding IA',
      'Gestion de projets et tâches',
      'Planification d\'équipe intelligente',
      'Base de connaissances interne',
      'Chatbot RH pour employés',
      'Rapports RH automatiques',
      'Conformité et documentation'
    ],
    benefits: [
      'Temps admin RH : -60%',
      'Satisfaction employés : +40%',
      'Onboarding : 3x plus rapide',
      'Conformité : 100% documents à jour',
      'Productivité : +25% avec meilleure planification',
      'Coûts : -45% vs logiciel RH classique'
    ],
    useCases: [
      '👥 PME gérant 10-100 employés',
      '📊 Suivi de projets multiples',
      '📅 Planning équipes sur terrain',
      '🎯 Évaluations annuelles automatisées',
      '📚 Base de connaissances procédures',
      '🤖 Assistant RH virtuel 24/7'
    ],
    pricing: 'Pack Service Client (10 000 FCFA/mois) ou Ventes (15 000 FCFA/mois). Jusqu\'à 100 employés inclus',
    workflow: `graph TD
    A[Employé Fait Demande] --> B[Bot IA Reçoit]
    B --> C{Type Demande?}
    C -->|Congé| D[Vérif Solde]
    C -->|Info| E[Base Connaissances]
    C -->|Problème| F[Ticket Manager]
    D --> G{Approuvé?}
    G -->|Oui| H[Confirmation Auto]
    G -->|Non| I[Alerte Manager]
    E --> J[Réponse Instantanée]
    F --> K[Escalade RH]`,
    faq: [
      {
        question: 'Remplace-t-il un logiciel RH complet ?',
        answer: 'Pour PME (10-100 personnes), oui ! Couvre 80% besoins : congés, absences, évaluations, onboarding. Intégrable avec paie externe.'
      },
      {
        question: 'Comment les employés interagissent ?',
        answer: 'Via chatbot (web ou WhatsApp). Demandes en langage naturel comme "Je veux poser un congé du 10 au 15 mars".'
      },
      {
        question: 'Les données RH sont-elles sécurisées ?',
        answer: 'Oui ! Chiffrement niveau bancaire, accès restreint par rôles, conformité RGPD, hébergement sécurisé, sauvegardes quotidiennes.'
      },
      {
        question: 'Puis-je personnaliser les workflows RH ?',
        answer: 'Totalement ! Définissez vos propres processus de validation, règles métier, templates de documents. Flexible à 100%.'
      },
      {
        question: 'Comment gérer le onboarding avec l\'IA ?',
        answer: 'Checklist automatique (documents, accès, formation), chatbot guide nouvel employé, tests de connaissances, feedback automatique.'
      }
    ]
  },
  {
    id: 'ia-citoyen',
    icon: '🏛️',
    title: 'IA Citoyen (Services Publics)',
    description: 'Solution spécialisée pour administrations et services publics pour améliorer l\'accès aux services citoyens.',
    features: [
      'Assistant virtuel service public 24/7',
      'Information sur démarches administratives',
      'Prise de rendez-vous en ligne',
      'Suivi de dossiers citoyens',
      'Orientation vers services compétents',
      'Multilingue (français + langues locales)',
      'Formulaires intelligents guidés',
      'Notifications SMS/WhatsApp',
      'Base documentaire réglementaire',
      'Analytics services publics'
    ],
    benefits: [
      'Accessibilité : 24/7 vs horaires bureau',
      'Attente : -70% aux guichets',
      'Satisfaction : +65% citoyens',
      'Efficacité : agents concentrés sur cas complexes',
      'Inclusion : accessible personnes à mobilité réduite',
      'Économies : -50% coûts accueil physique'
    ],
    useCases: [
      '🏛️ Mairies (état civil, urbanisme, formalités)',
      '🏥 Hôpitaux publics (rendez-vous, info santé)',
      '🎓 Universités (inscriptions, info formations)',
      '💼 Services fiscaux (déclarations, info impôts)',
      '🚔 Préfectures (permis, cartes identité)',
      '⚖️ Tribunaux (info procédures juridiques)'
    ],
    pricing: 'Tarification sur devis selon taille structure. Pack Découverte gratuit pour tester. À partir de 50 000 FCFA/mois',
    workflow: `graph TD
    A[Citoyen Contacte] --> B[IA Accueille]
    B --> C{Besoin?}
    C -->|Info| D[Base Documentaire]
    C -->|Démarche| E[Guide Étape/Étape]
    C -->|RDV| F[Disponibilités]
    D --> G[Réponse Complète]
    E --> H[Documents Requis]
    F --> I[Confirmation RDV]
    H --> J[Dépôt Dossier]
    J --> K[Suivi Automatique]`,
    faq: [
      {
        question: 'Convient-il vraiment aux administrations ?',
        answer: 'Oui ! Déjà déployé dans 5+ mairies béninoises. Conçu pour services publics : sécurité renforcée, conformité totale, multilingue.'
      },
      {
        question: 'Comment gérer la diversité des services ?',
        answer: 'Configuration modulaire par service (état civil, urbanisme, social, etc.). Chaque service a son bot spécialisé + coordination centrale.'
      },
      {
        question: 'Est-ce accessible aux citoyens sans internet ?',
        answer: 'Oui ! Canal WhatsApp (data minime), SMS pour notifications, bornes tactiles en mairie. Assistance téléphonique reste disponible.'
      },
      {
        question: 'Comment assurer la conformité réglementaire ?',
        answer: 'Base documentaire validée par juristes, audit trail complet, signatures électroniques certifiées, conformité RGPD et lois locales.'
      },
      {
        question: 'Quel accompagnement pour le déploiement ?',
        answer: 'Formation agents 2 jours, parametrage sur mesure, communication citoyens (affiches, spots), support dédié 6 mois, puis illimité.'
      }
    ]
  },
  {
    id: 'analytics',
    icon: '📊',
    title: 'Analytics & Reporting Avancés',
    description: 'Tableaux de bord complets et rapports automatisés pour piloter votre activité avec des données précises.',
    features: [
      'Dashboard temps réel personnalisable',
      '50+ métriques suivies automatiquement',
      'Graphiques interactifs avancés',
      'Rapports automatiques (quotidien, hebdo, mensuel)',
      'Export multi-formats (PDF, Excel, PowerPoint)',
      'Analyse de sentiment conversations',
      'Identification tendances et patterns',
      'Prévisions IA (ventes, trafic, etc.)',
      'Comparaison périodes (YoY, MoM)',
      'Alertes automatiques sur anomalies'
    ],
    benefits: [
      'Visibilité : décisions basées données réelles',
      'Temps : rapports générés en 2 min vs 2h manuel',
      'Précision : 0% erreurs vs 15% manuel',
      'Réactivité : alertes temps réel',
      'ROI : identification rapide ce qui marche/marche pas',
      'Stratégie : prévisions fiables pour planification'
    ],
    useCases: [
      '📈 Suivi performance commerciale quotidienne',
      '🎯 ROI campagnes marketing',
      '💬 Analyse satisfaction client',
      '👥 Performance équipe de vente',
      '📊 Reporting direction mensuel',
      '🔍 Identification opportunités croissance'
    ],
    pricing: 'Tous les packs (niveau de détail selon pack). Analytics avancés : Pack Pro+',
    workflow: `graph TD
    A[Collecte Données] --> B[Agrégation Temps Réel]
    B --> C[Calcul Métriques]
    C --> D[Analyse IA]
    D --> E[Génération Dashboard]
    E --> F[Détection Anomalies]
    F --> G{Alerte?}
    G -->|Oui| H[Notification]
    G -->|Non| I[Monitoring Continu]
    H --> J[Action Corrective]
    I --> K[Rapport Automatique]`,
    faq: [
      {
        question: 'Quelles métriques sont suivies ?',
        answer: 'Conversations (volume, durée, satisfaction), conversions (leads, ventes), performance (taux résolution, temps réponse), utilisateurs, ROI, etc.'
      },
      {
        question: 'Puis-je créer mes propres rapports ?',
        answer: 'Oui ! Builder de rapports avec drag & drop. Choisissez métriques, périodes, graphiques. Sauvegardez et planifiez envoi automatique.'
      },
      {
        question: 'Les rapports sont-ils envoyés automatiquement ?',
        answer: 'Oui ! Configurez envoi quotidien/hebdo/mensuel par email. PDF professionnel prêt à présenter. Distribution multiple destinataires.'
      },
      {
        question: 'Comment fonctionne l\'analyse de sentiment ?',
        answer: 'IA analyse chaque conversation et détecte émotions (satisfait, frustré, neutre, etc.). Identifie problèmes récurrents automatiquement.'
      },
      {
        question: 'Les prévisions IA sont-elles fiables ?',
        answer: 'Précision 85-90% après 3 mois de données. Plus vous utilisez longtemps, plus les prévisions s\'affinent. Modèle entraîné continuellement.'
      }
    ]
  },
  {
    id: 'knowledge-bases',
    icon: '📚',
    title: 'Bases de Connaissances Sectorielles',
    description: '8 templates intelligents pré-configurés par secteur pour démarrer instantanément avec un bot performant.',
    features: [
      '50-100 Q&R pré-remplies par secteur',
      'Workflows métier préconfigurés',
      'Personnalité adaptée au secteur',
      'Vocabulaire technique du métier',
      'Cas d\'usage types inclus',
      'Import de vos données (Excel, PDF, web)',
      'Mise à jour continue de la base',
      'Apprentissage des conversations réelles',
      'Suggestions d\'amélioration IA',
      'Export/Import entre bots'
    ],
    benefits: [
      'Déploiement : 10 min vs 2-4 semaines',
      'Précision : 95% dès le premier jour',
      'Économie : 200k - 500k FCFA formation évités',
      'Personnalisation : ajustement facile post-lancement',
      'Évolution : amélioration automatique continue',
      'Expertise : best practices secteur intégrées'
    ],
    useCases: [
      '🏨 Hôtellerie (réservations, services, tarifs)',
      '🛒 E-commerce (catalogue, commandes, livraison)',
      '🎓 Formation (programmes, inscriptions, calendrier)',
      '🏘️ Immobilier (biens, visites, financement)',
      '💼 B2B (devis, services, support)',
      '🎨 Marketing (tarifs, portfolio, processus)',
      '🏛️ Public (démarches, documents, horaires)',
      '🤝 ONG (missions, bénévolat, dons)'
    ],
    pricing: 'Inclus dans TOUS les packs (même Gratuit). 8 secteurs disponibles',
    workflow: `graph TD
    A[Choisir Secteur] --> B[Template Chargé]
    B --> C[50-100 Q&R Prêtes]
    C --> D[Personnalisation Optionnelle]
    D --> E[Ajout Données Propres]
    E --> F[Tests Interactifs]
    F --> G{Performance?}
    G -->|>90%| H[Déploiement]
    G -->|<90%| I[Affinage]
    I --> F
    H --> J[Apprentissage Continu]`,
    faq: [
      {
        question: 'Quels secteurs sont couverts ?',
        answer: 'Hôtellerie & Tourisme, E-commerce & Retail, Formation & Éducation, Immobilier, Services B2B/PME, Marketing & Communication, Services Publics, ONG & Associations.'
      },
      {
        question: 'Puis-je combiner plusieurs secteurs ?',
        answer: 'Oui ! Créez plusieurs bots (1 par secteur) ou fusionnez templates. Ex : Hôtel + Restaurant = template combiné personnalisé.'
      },
      {
        question: 'Les templates sont-ils vraiment complets ?',
        answer: '50-100 Q&R couvrent 80% besoins courants du secteur. Vous ajoutez 20% spécifique à votre business. Opérationnel en 10 min.'
      },
      {
        question: 'Comment ajouter mes propres données ?',
        answer: 'Upload documents (PDF, Word, Excel, site web). L\'IA extrait automatiquement questions/réponses. Validation manuelle rapide.'
      },
      {
        question: 'Les templates évoluent-ils ?',
        answer: 'Oui ! Mises à jour trimestrielles avec nouvelles Q&R basées sur retours clients. Amélioration continue des best practices.'
      }
    ]
  },
  {
    id: 'integrations',
    icon: '🔗',
    title: 'Intégrations & API',
    description: 'Connectez Bot.bj à tous vos outils existants via API REST, webhooks et intégrations natives.',
    features: [
      'API REST complète et documentée',
      'Webhooks entrants/sortants illimités',
      'OAuth 2.0 authentification sécurisée',
      '400+ intégrations natives (Zapier, Make)',
      'SDKs JavaScript, Python, PHP',
      'Environnement sandbox de test',
      'Rate limiting configurable',
      'Monitoring et logs API',
      'Documentation interactive (Swagger)',
      'Support technique dédié intégrations'
    ],
    benefits: [
      'Connectivité : intégrez n\'importe quel outil',
      'Flexibilité : adaptation à votre stack tech',
      'Automatisation : 0 copier-coller manuel',
      'Synchronisation : données toujours à jour',
      'Scalabilité : gère millions requêtes/mois',
      'Sécurité : authentification niveau entreprise'
    ],
    useCases: [
      '🔄 Sync CRM bidirectionnel (Salesforce, HubSpot)',
      '📊 Export auto vers Google Sheets',
      '💳 Intégration paiement (Stripe, PayPal)',
      '📧 Sync email (Gmail, Outlook)',
      '💬 Notifications Slack/Teams',
      '🛒 Intégration e-commerce (Shopify, WooCommerce)'
    ],
    pricing: 'API incluse tous packs. Limitations selon pack : 1k requêtes/mois (Gratuit), 100k (Pro), illimité (Ventes)',
    workflow: `graph TD
    A[Action Bot.bj] --> B[Webhook Déclenché]
    B --> C[Appel API Externe]
    C --> D[Traitement Données]
    D --> E[Réponse API]
    E --> F[Mise à Jour Bot.bj]
    F --> G[Action Automatique]
    G --> H[Sync Bidirectionnelle]`,
    faq: [
      {
        question: 'L\'API est-elle facile à utiliser ?',
        answer: 'Oui ! Documentation complète avec exemples, tutoriels vidéo, SDKs prêts à l\'emploi. Pas besoin d\'être expert pour intégrer.'
      },
      {
        question: 'Combien de requêtes API puis-je faire ?',
        answer: 'Gratuit : 1 000/mois, Essentiel : 10 000/mois, Pro : 100 000/mois, Ventes : illimité. Rate limit : 100 req/min (ajustable).'
      },
      {
        question: 'Puis-je créer mes propres intégrations ?',
        answer: 'Oui ! API REST complète + webhooks. Créez n\'importe quelle intégration. Si besoin d\'aide, notre équipe peut développer sur devis.'
      },
      {
        question: 'Comment tester sans impacter la production ?',
        answer: 'Environnement sandbox dédié. Données de test, pas de limite, logs détaillés. Testez tranquillement avant de déployer.'
      },
      {
        question: 'Quelle sécurité pour les intégrations ?',
        answer: 'OAuth 2.0, tokens API rotatifs, HTTPS obligatoire, IP whitelisting, logs d\'audit, détection anomalies. Niveau sécurité bancaire.'
      }
    ]
  }
];
