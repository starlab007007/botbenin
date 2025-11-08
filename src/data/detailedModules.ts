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
  }
];
