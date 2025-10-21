import { KnowledgeBaseTemplate } from '@/types/knowledge-base';

export const KNOWLEDGE_BASE_TEMPLATES: KnowledgeBaseTemplate[] = [
  {
    id: 'restaurant',
    sector: 'restaurant',
    name: 'Restauration',
    description: 'Base de connaissances complète pour restaurant, café, fast-food',
    icon: 'UtensilsCrossed',
    color: 'from-orange-400 to-red-500',
    structuralInfo: [
      { name: 'nom_etablissement', type: 'text', category: 'contact', required: true, description: 'Nom de votre établissement', placeholder: 'Le Petit Bistrot' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Numéro de téléphone', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email de contact', placeholder: 'contact@restaurant.com' },
      { name: 'adresse', type: 'text', category: 'location', required: true, description: 'Adresse complète', placeholder: '123 Rue de la Paix, Cotonou' },
      { name: 'horaires_semaine', type: 'text', category: 'hours', required: false, description: 'Horaires en semaine', placeholder: 'Lun-Ven: 11h-23h' },
      { name: 'horaires_weekend', type: 'text', category: 'hours', required: false, description: 'Horaires week-end', placeholder: 'Sam-Dim: 12h-00h' },
      { name: 'delai_livraison', type: 'text', category: 'policy', required: false, description: 'Délai de livraison', placeholder: '30-45 min' },
      { name: 'modes_paiement', type: 'text', category: 'policy', required: false, description: 'Modes de paiement acceptés', placeholder: 'Espèces, Mobile Money, CB' }
    ],
    tables: [
      {
        id: 'menu',
        name: 'Menu',
        description: 'Liste complète des plats et boissons',
        required: true,
        icon: 'UtensilsCrossed',
        fields: [
          { name: 'categorie', type: 'select', required: true, options: ['Entrées', 'Plats', 'Desserts', 'Boissons', 'Spécialités'], placeholder: 'Sélectionner une catégorie' },
          { name: 'sous_categorie', type: 'text', required: false, placeholder: 'Ex: Plats africains' },
          { name: 'nom', type: 'text', required: true, placeholder: 'Poulet DG' },
          { name: 'description', type: 'textarea', required: false, placeholder: 'Description du plat' },
          { name: 'allergenes', type: 'text', required: false, placeholder: 'Gluten, Lactose' },
        { name: 'prix', type: 'price', required: true, placeholder: '3500' },
        { name: 'disponible', type: 'select', required: true, options: ['Oui', 'Non'] },
        { name: 'image', type: 'image', required: false }
      ]
      },
      {
        id: 'faq',
        name: 'Questions Fréquentes',
        description: 'Questions clients et réponses types',
        required: false,
        icon: 'MessageCircleQuestion',
        fields: [
          { name: 'question', type: 'text', required: true, placeholder: 'Livrez-vous le soir ?' },
          { name: 'reponse', type: 'textarea', required: true, placeholder: 'Oui, nous livrons jusqu\'à 23h tous les jours' }
        ]
      }
    ]
  },
  {
    id: 'hotel',
    sector: 'hotel',
    name: 'Hôtellerie',
    description: 'Base de connaissances pour hôtel, motel, résidence',
    icon: 'Hotel',
    color: 'from-blue-400 to-indigo-500',
    structuralInfo: [
      { name: 'nom_etablissement', type: 'text', category: 'contact', required: true, description: 'Nom de l\'hôtel', placeholder: 'Grand Hôtel' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Numéro de réception', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email de réservation', placeholder: 'reservation@hotel.com' },
      { name: 'adresse', type: 'text', category: 'location', required: true, description: 'Adresse complète', placeholder: '456 Avenue du Lac' },
      { name: 'heure_checkin', type: 'text', category: 'hours', required: false, description: 'Heure de check-in', placeholder: '14h00' },
      { name: 'heure_checkout', type: 'text', category: 'hours', required: false, description: 'Heure de check-out', placeholder: '12h00' },
      { name: 'politique_annulation', type: 'text', category: 'policy', required: false, description: 'Politique d\'annulation', placeholder: 'Gratuit jusqu\'à 24h avant' },
      { name: 'animaux_acceptes', type: 'text', category: 'policy', required: false, description: 'Animaux acceptés ?', placeholder: 'Oui, sur demande' }
    ],
    tables: [
      {
        id: 'chambres',
        name: 'Chambres',
        description: 'Catalogue des chambres disponibles',
        required: true,
        icon: 'Bed',
        fields: [
          { name: 'type', type: 'select', required: true, options: ['Standard', 'Supérieure', 'Suite', 'Deluxe'], placeholder: 'Type de chambre' },
          { name: 'description', type: 'textarea', required: true, placeholder: 'Description de la chambre' },
          { name: 'capacite_max', type: 'number', required: true, placeholder: '2' },
        { name: 'prix_nuit', type: 'price', required: true, placeholder: '25000' },
        { name: 'equipements', type: 'text', required: false, placeholder: 'WiFi, TV, Climatisation' },
        { name: 'statut', type: 'select', required: true, options: ['Disponible', 'Occupé', 'Maintenance'] },
        { name: 'image', type: 'image', required: false }
      ]
      },
      {
        id: 'services',
        name: 'Services',
        description: 'Services supplémentaires de l\'hôtel',
        required: false,
        icon: 'Sparkles',
        fields: [
          { name: 'nom_service', type: 'text', required: true, placeholder: 'Petit déjeuner' },
          { name: 'categorie', type: 'select', required: true, options: ['Basique', 'Restauration', 'Commodité', 'Assistance'] },
          { name: 'description', type: 'textarea', required: true, placeholder: 'Description du service' },
          { name: 'prix', type: 'price', required: false, placeholder: '5000' },
          { name: 'disponible_24_7', type: 'select', required: true, options: ['Oui', 'Non'] }
        ]
      }
    ]
  },
  {
    id: 'real_estate',
    sector: 'real_estate',
    name: 'Immobilier',
    description: 'Base de connaissances pour agence immobilière',
    icon: 'Building2',
    color: 'from-green-400 to-emerald-500',
    structuralInfo: [
      { name: 'nom_agence', type: 'text', category: 'contact', required: true, description: 'Nom de l\'agence', placeholder: 'Immo Plus' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Téléphone', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email', placeholder: 'contact@immo.com' },
      { name: 'adresse_bureau', type: 'text', category: 'location', required: true, description: 'Adresse du bureau', placeholder: 'Centre-ville' },
      { name: 'horaires_bureau', type: 'text', category: 'hours', required: false, description: 'Horaires d\'ouverture', placeholder: 'Lun-Sam: 8h-18h' }
    ],
    tables: [
      {
        id: 'proprietes',
        name: 'Propriétés',
        description: 'Catalogue des biens immobiliers',
        required: true,
        icon: 'Home',
        fields: [
          { name: 'type', type: 'select', required: true, options: ['Appartement', 'Maison', 'Terrain', 'Commerce', 'Bureau'] },
          { name: 'transaction', type: 'select', required: true, options: ['Vente', 'Location'] },
          { name: 'prix', type: 'price', required: true, placeholder: '50000000' },
          { name: 'surface_m2', type: 'number', required: true, placeholder: '150' },
          { name: 'nb_pieces', type: 'number', required: false, placeholder: '4' },
          { name: 'adresse_complete', type: 'address', required: true, placeholder: 'Adresse du bien' },
          { name: 'ville', type: 'text', required: true, placeholder: 'Cotonou' },
          { name: 'quartier', type: 'text', required: true, placeholder: 'Akpakpa' },
          { name: 'description', type: 'textarea', required: false, placeholder: 'Description du bien' },
          { name: 'statut', type: 'select', required: true, options: ['Disponible', 'Réservé', 'Vendu/Loué'] },
          { name: 'image', type: 'image', required: false },
          { name: 'documents', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      }
    ]
  },
  {
    id: 'ecommerce',
    sector: 'ecommerce',
    name: 'E-commerce',
    description: 'Base de connaissances pour boutique en ligne',
    icon: 'ShoppingCart',
    color: 'from-purple-400 to-pink-500',
    structuralInfo: [
      { name: 'nom_boutique', type: 'text', category: 'contact', required: true, description: 'Nom de la boutique', placeholder: 'Ma Boutique' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Téléphone', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email', placeholder: 'contact@boutique.com' },
      { name: 'adresse', type: 'text', category: 'location', required: false, description: 'Adresse physique', placeholder: 'Optionnel si 100% en ligne' },
      { name: 'horaires_service_client', type: 'text', category: 'hours', required: false, description: 'Horaires service client', placeholder: 'Lun-Ven: 9h-18h' },
      { name: 'delai_livraison', type: 'text', category: 'policy', required: false, description: 'Délai de livraison', placeholder: '2-5 jours ouvrés' },
      { name: 'frais_livraison', type: 'text', category: 'policy', required: false, description: 'Frais de livraison', placeholder: 'Gratuit > 50 000 FCFA' }
    ],
    tables: [
      {
        id: 'produits',
        name: 'Produits',
        description: 'Catalogue de produits',
        required: true,
        icon: 'Package',
        fields: [
          { name: 'nom', type: 'text', required: true, placeholder: 'Nom du produit' },
          { name: 'categorie', type: 'text', required: true, placeholder: 'Vêtements, Électronique...' },
          { name: 'prix', type: 'price', required: true, placeholder: '15000' },
          { name: 'stock', type: 'number', required: true, placeholder: '50' },
          { name: 'description', type: 'textarea', required: false, placeholder: 'Description détaillée' },
          { name: 'image', type: 'image', required: false },
          { name: 'fiche_technique', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      },
      {
        id: 'promotions',
        name: 'Promotions',
        description: 'Offres et promotions en cours',
        required: false,
        icon: 'Tag',
        fields: [
          { name: 'nom_promo', type: 'text', required: true, placeholder: 'Soldes d\'été' },
          { name: 'code_promo', type: 'text', required: false, placeholder: 'ETE2025' },
          { name: 'type', type: 'select', required: true, options: ['Pourcentage', 'Montant fixe', 'Livraison gratuite'] },
          { name: 'valeur', type: 'text', required: true, placeholder: '20% ou 5000 FCFA' },
          { name: 'date_debut', type: 'date', required: true, placeholder: '2025-01-01' },
          { name: 'date_fin', type: 'date', required: true, placeholder: '2025-01-31' }
        ]
      }
    ]
  },
  {
    id: 'training',
    sector: 'training',
    name: 'Formation & Consulting',
    description: 'Base de connaissances pour centre de formation',
    icon: 'GraduationCap',
    color: 'from-yellow-400 to-orange-500',
    structuralInfo: [
      { name: 'nom_centre', type: 'text', category: 'contact', required: true, description: 'Nom du centre', placeholder: 'Centre de Formation Pro' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Téléphone', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email', placeholder: 'info@formation.com' },
      { name: 'adresse', type: 'text', category: 'location', required: true, description: 'Adresse', placeholder: 'Adresse du centre' },
      { name: 'horaires_bureau', type: 'text', category: 'hours', required: false, description: 'Horaires', placeholder: 'Lun-Ven: 8h-17h' },
      { name: 'modalites_paiement', type: 'text', category: 'policy', required: false, description: 'Modalités de paiement', placeholder: 'Paiement en plusieurs fois possible' }
    ],
    tables: [
      {
        id: 'formations',
        name: 'Formations',
        description: 'Catalogue des formations',
        required: true,
        icon: 'BookOpen',
        fields: [
          { name: 'nom_cours', type: 'text', required: true, placeholder: 'Développement Web' },
          { name: 'description', type: 'textarea', required: true, placeholder: 'Description du cours' },
          { name: 'duree_heures', type: 'number', required: true, placeholder: '120' },
          { name: 'niveau', type: 'select', required: true, options: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'] },
          { name: 'frais', type: 'price', required: true, placeholder: '250000' },
          { name: 'date_debut', type: 'datetime', required: false, placeholder: 'Date et heure de début' },
          { name: 'certification_incluse', type: 'select', required: true, options: ['Oui', 'Non'] },
          { name: 'image', type: 'image', required: false },
          { name: 'programme_detaille', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      },
      {
        id: 'consulting',
        name: 'Consulting',
        description: 'Services de consulting',
        required: false,
        icon: 'Briefcase',
        fields: [
          { name: 'nom_mission', type: 'text', required: true, placeholder: 'Audit IT' },
          { name: 'description', type: 'textarea', required: true, placeholder: 'Description sommaire' },
          { name: 'competence_cle', type: 'text', required: true, placeholder: 'Cybersécurité' },
          { name: 'fourchette_prix', type: 'text', required: true, placeholder: '500 000 - 2 000 000 FCFA' },
          { name: 'duree_typique', type: 'text', required: false, placeholder: '1-3 mois' },
          { name: 'image', type: 'image', required: false },
          { name: 'presentation', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      }
    ]
  },
  {
    id: 'university',
    sector: 'university',
    name: 'Université & École & Centre de Formation',
    description: 'Base de connaissances pour université, école et centre de formation',
    icon: 'School',
    color: 'from-cyan-400 to-blue-500',
    structuralInfo: [
      { name: 'nom_etablissement', type: 'text', category: 'contact', required: true, description: 'Nom de l\'établissement', placeholder: 'Université Excellence' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Téléphone', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email', placeholder: 'admissions@universite.com' },
      { name: 'localisation_campus', type: 'text', category: 'location', required: true, description: 'Localisation', placeholder: 'Campus principal' },
      { name: 'frais_inscription', type: 'text', category: 'policy', required: false, description: 'Frais d\'inscription', placeholder: '50 000 FCFA' },
      { name: 'date_limite_inscription', type: 'text', category: 'policy', required: false, description: 'Date limite', placeholder: '30 Septembre' },
      { name: 'aide_financiere', type: 'text', category: 'policy', required: false, description: 'Bourses disponibles', placeholder: 'Oui, selon mérite' }
    ],
    tables: [
      {
        id: 'programmes',
        name: 'Programmes d\'Études',
        description: 'Programmes académiques disponibles',
        required: true,
        icon: 'BookMarked',
        fields: [
          { name: 'nom_programme', type: 'text', required: true, placeholder: 'Licence en Informatique' },
          { name: 'diplome', type: 'select', required: true, options: ['Licence', 'Master', 'Doctorat', 'MBA'] },
          { name: 'domaine', type: 'text', required: true, placeholder: 'Sciences & Technologies' },
          { name: 'duree_ans', type: 'number', required: true, placeholder: '3' },
          { name: 'frais_scolarite_annuel', type: 'price', required: true, placeholder: '1500000' },
          { name: 'date_rentree', type: 'datetime', required: false, placeholder: 'Date et heure de rentrée' },
          { name: 'statut', type: 'select', required: true, options: ['Ouvert', 'Complet', 'Bientôt'] },
          { name: 'image', type: 'image', required: false },
          { name: 'brochure', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      },
      {
        id: 'admission',
        name: 'Processus d\'Admission',
        description: 'Étapes du processus d\'admission',
        required: false,
        icon: 'FileCheck',
        fields: [
          { name: 'programme', type: 'text', required: true, placeholder: 'Nom du programme' },
          { name: 'nom_etape', type: 'text', required: true, placeholder: 'Dépôt du dossier en ligne' },
          { name: 'delai_typique_jours', type: 'number', required: false, placeholder: '7' },
          { name: 'pieces_requises', type: 'textarea', required: false, placeholder: 'BAC, relevés de notes...' },
          { name: 'formulaires', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      }
    ]
  },
  {
    id: 'clinic',
    sector: 'clinic',
    name: 'Clinique Privée',
    description: 'Base de connaissances pour clinique privée',
    icon: 'Hospital',
    color: 'from-red-400 to-rose-500',
    structuralInfo: [
      { name: 'nom_clinique', type: 'text', category: 'contact', required: true, description: 'Nom de la clinique', placeholder: 'Clinique Santé Plus' },
      { name: 'telephone_standard', type: 'phone', category: 'contact', required: true, description: 'Téléphone standard', placeholder: '+229 XX XX XX XX' },
      { name: 'urgence_telephone', type: 'phone', category: 'contact', required: false, description: 'Urgences', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email', placeholder: 'contact@clinique.com' },
      { name: 'localisation', type: 'text', category: 'location', required: true, description: 'Localisation', placeholder: 'Adresse de la clinique' },
      { name: 'horaires_visites', type: 'text', category: 'hours', required: false, description: 'Horaires de visite', placeholder: '14h-17h' },
      { name: 'pieces_consultation', type: 'text', category: 'policy', required: false, description: 'Pièces à apporter', placeholder: 'Carte d\'identité, carnet de santé' },
      { name: 'modes_paiement', type: 'text', category: 'policy', required: false, description: 'Paiement et prise en charge', placeholder: 'Espèces, assurance acceptée' }
    ],
    tables: [
      {
        id: 'specialites',
        name: 'Spécialités Médicales',
        description: 'Spécialités et médecins praticiens',
        required: true,
        icon: 'Stethoscope',
        fields: [
          { name: 'nom_specialite', type: 'text', required: true, placeholder: 'Cardiologie' },
          { name: 'description', type: 'textarea', required: true, placeholder: 'Description de la spécialité' },
          { name: 'medecins', type: 'textarea', required: false, placeholder: 'Dr. Dupont, Dr. Martin' },
          { name: 'horaires_consultation', type: 'text', required: false, placeholder: 'Lun-Ven: 9h-17h' },
          { name: 'image', type: 'image', required: false },
          { name: 'documents_info', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      },
      {
        id: 'services',
        name: 'Services Cliniques',
        description: 'Services disponibles à la clinique',
        required: false,
        icon: 'Activity',
        fields: [
          { name: 'nom_service', type: 'text', required: true, placeholder: 'Laboratoire' },
          { name: 'etages', type: 'text', required: false, placeholder: 'Rez-de-chaussée' },
          { name: 'horaires_ouverture', type: 'text', required: false, placeholder: '24/7' },
          { name: 'telephone_direct', type: 'phone', required: false, placeholder: '+229 XX XX XX XX' }
        ]
      }
    ]
  },
  {
    id: 'others',
    sector: 'others',
    name: 'Autres (Personnalisé)',
    description: 'Créez votre propre base de connaissances personnalisée',
    icon: 'Settings',
    color: 'from-gray-400 to-slate-500',
    structuralInfo: [
      { name: 'nom_entreprise', type: 'text', category: 'contact', required: true, description: 'Nom de votre entreprise', placeholder: 'Ma Société' },
      { name: 'telephone', type: 'phone', category: 'contact', required: true, description: 'Téléphone', placeholder: '+229 XX XX XX XX' },
      { name: 'email', type: 'email', category: 'contact', required: false, description: 'Email', placeholder: 'contact@entreprise.com' },
      { name: 'adresse', type: 'text', category: 'location', required: true, description: 'Adresse', placeholder: 'Votre adresse' },
      { name: 'horaires', type: 'text', category: 'hours', required: false, description: 'Horaires d\'ouverture', placeholder: 'Lun-Ven: 8h-18h' },
      { name: 'site_web', type: 'url', category: 'contact', required: false, description: 'Site web', placeholder: 'https://www.example.com' }
    ],
    tables: [
      {
        id: 'produits_services',
        name: 'Produits / Services',
        description: 'Liste de vos produits ou services',
        required: true,
        icon: 'Package',
        fields: [
          { name: 'nom', type: 'text', required: true, placeholder: 'Nom du produit/service' },
          { name: 'description', type: 'textarea', required: true, placeholder: 'Description détaillée' },
          { name: 'categorie', type: 'text', required: false, placeholder: 'Catégorie' },
          { name: 'prix', type: 'price', required: false, placeholder: '10000' },
          { name: 'disponible', type: 'select', required: true, options: ['Oui', 'Non'] },
          { name: 'image', type: 'image', required: false },
          { name: 'documents', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      },
      {
        id: 'faq',
        name: 'Questions Fréquentes',
        description: 'Questions et réponses pour vos clients',
        required: false,
        icon: 'MessageCircleQuestion',
        fields: [
          { name: 'question', type: 'text', required: true, placeholder: 'Question fréquente' },
          { name: 'reponse', type: 'textarea', required: true, placeholder: 'Réponse détaillée' },
          { name: 'categorie', type: 'text', required: false, placeholder: 'Catégorie de la question' }
        ]
      },
      {
        id: 'informations_generales',
        name: 'Informations Générales',
        description: 'Autres informations importantes',
        required: false,
        icon: 'Info',
        fields: [
          { name: 'titre', type: 'text', required: true, placeholder: 'Titre de l\'information' },
          { name: 'contenu', type: 'textarea', required: true, placeholder: 'Contenu de l\'information' },
          { name: 'type', type: 'select', required: false, options: ['Politique', 'Procédure', 'Guide', 'Autre'] },
          { name: 'documents_joints', type: 'file', required: false, placeholder: 'PDF, Word, Excel' }
        ]
      }
    ]
  }
];
