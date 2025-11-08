import { CompleteModuleData } from '@/types/module';

export const iaCreateurModule: CompleteModuleData = {
  id: 'ia-createur',
  icon: '🎨',
  title: 'IA Créateur Visuel - Génération d\'Images',
  category: 'IA',
  badge: 'New',
  
  presentation: {
    shortDescription: 'Générez des images, visuels marketing, et contenus graphiques professionnels par simple description texte.',
    fullDescription: [
      'IA Créateur Visuel transforme vos idées en visuels professionnels en quelques secondes. Décrivez ce que vous voulez en français ("Une bannière web moderne pour une boutique de mode africaine"), et l\'IA génère une image HD prête à utiliser.',
      'Propulsé par les modèles d\'IA générative les plus avancés (DALL-E 3, Midjourney API, Stable Diffusion XL), cet outil produit : posts réseaux sociaux, bannières web, illustrations articles, logos, mockups produits, visuels publicitaires. Qualité professionnelle, sans designer, sans Photoshop.',
      'Parfait pour e-commerce, marketing digital, créateurs de contenu, et PME qui ont besoin de visuels de qualité sans le coût d\'un graphiste (150 000+ FCFA/mois économisés). Générez 100+ variations, choisissez la meilleure, modifiez avec des prompts, et exportez en haute résolution.'
    ],
    videoUrl: '/videos/ia-createur-demo.mp4',
    screenshots: [
      '/images/ia-createur-interface.png',
      '/images/ia-createur-gallery.png',
      '/images/ia-createur-edit.png',
      '/images/ia-createur-export.png'
    ]
  },
  
  features: [
    {
      name: 'Génération d\'Images par Texte',
      description: 'Décrivez votre image en français, l\'IA la génère en haute définition (jusqu\'à 2048x2048px).',
      advantage: 'Création visuelle sans compétences design',
      howToUse: [
        'Entrez votre description (ex: "Logo minimaliste pour restaurant africain")',
        'Choisissez le style (Réaliste, Artistique, Cartoon, 3D)',
        'Cliquez "Générer", résultat en 10 secondes'
      ]
    },
    {
      name: 'Styles & Modèles Multiples',
      description: 'Choix entre 10+ styles : Photographie, Illustration, 3D, Pixel Art, Aquarelle, Art Africain, Moderne, Vintage...',
      advantage: 'Cohérence visuelle avec votre marque',
      howToUse: [
        'Sélectionnez le style dans le menu',
        'Pré-visualisez avec des exemples',
        'Changez de style pour varier les rendus'
      ]
    },
    {
      name: 'Templates Pré-Configurés',
      description: '50+ templates pour posts Instagram, Facebook, LinkedIn, YouTube thumbnails, bannières web, flyers.',
      advantage: 'Formats optimisés, gain de temps -80%',
      howToUse: [
        'Cliquez "Nouveau depuis Template"',
        'Choisissez le type (Post Instagram, Bannière...)',
        'Personnalisez le texte et éléments'
      ]
    },
    {
      name: 'Génération de Variations',
      description: 'Générez 4 variations différentes d\'une même idée, choisissez la meilleure ou combinez les éléments.',
      advantage: 'Plus de choix, créativité maximale',
      howToUse: [
        'Après génération, cliquez "Générer Variations"',
        '4 nouvelles images similaires mais différentes',
        'Sélectionnez votre préférée'
      ]
    },
    {
      name: 'Édition & Refinement',
      description: 'Modifiez une image générée avec des prompts additionnels : "Ajoute un coucher de soleil", "Change la couleur en bleu".',
      advantage: 'Contrôle total sur le résultat final',
      howToUse: [
        'Sélectionnez l\'image à modifier',
        'Cliquez "Éditer"',
        'Donnez l\'instruction de modification'
      ]
    },
    {
      name: 'Suppression de Fond (Background Removal)',
      description: 'Retirez automatiquement l\'arrière-plan de n\'importe quelle image pour obtenir un PNG transparent.',
      advantage: 'Parfait pour produits e-commerce',
      howToUse: [
        'Uploadez ou générez une image',
        'Cliquez "Supprimer Fond"',
        'Téléchargez en PNG transparent'
      ]
    },
    {
      name: 'Upscaling HD',
      description: 'Augmentez la résolution de vos images jusqu\'à 4K sans perte de qualité (IA restauration).',
      advantage: 'Qualité print et grands formats',
      howToUse: [
        'Sélectionnez l\'image',
        'Cliquez "Upscale" et choisissez la résolution',
        'Export en haute définition'
      ]
    },
    {
      name: 'Bibliothèque & Organisation',
      description: 'Toutes vos créations sauvegardées automatiquement, organisées par projets, avec tags et recherche.',
      advantage: 'Retrouvez n\'importe quelle création instantanément',
      howToUse: [
        'Onglet "Bibliothèque"',
        'Créez des dossiers par projet/client',
        'Utilisez les tags et la recherche'
      ]
    }
  ],
  
  workflow: {
    mermaidCode: `graph TD
    A[Utilisateur décrit l'image] --> B{Nouveau ou Template?}
    B -->|Template| C[Sélection Template]
    B -->|Nouveau| D[Prompt Libre]
    C --> E[Personnalisation Prompt]
    D --> E
    E --> F[Choix Style Artistique]
    F --> G[Envoi API IA Générative]
    G --> H[Génération Image 10-30s]
    H --> I[Affichage Résultat]
    I --> J{Satisfait?}
    J -->|Non| K[Générer Variations]
    K --> I
    J -->|Non| L[Modifier avec Prompt]
    L --> G
    J -->|Oui| M[Téléchargement HD]
    M --> N[Utilisation Marketing]`,
    stepsExplanation: [
      {
        step: 1,
        title: 'Description & Style',
        description: 'L\'utilisateur décrit l\'image souhaitée et choisit le style artistique'
      },
      {
        step: 2,
        title: 'Génération IA',
        description: 'L\'IA crée l\'image en 10-30 secondes selon la complexité'
      },
      {
        step: 3,
        title: 'Refinement Itératif',
        description: 'Génération de variations ou modifications jusqu\'à satisfaction'
      },
      {
        step: 4,
        title: 'Export & Utilisation',
        description: 'Téléchargement en HD pour utilisation immédiate'
      }
    ]
  },
  
  stepByStep: {
    prerequisites: [
      'Compte Bot.bj pack Essentiel minimum',
      'Idée claire de l\'image souhaitée',
      'Connexion internet stable'
    ],
    estimatedTime: '3 minutes',
    steps: [
      {
        number: 1,
        title: 'Accéder à IA Créateur',
        duration: '10 secondes',
        actions: [
          'Menu "IA" → "IA Créateur Visuel"',
          'Ou raccourci depuis dashboard : bouton "Créer une Image"'
        ],
        screenshot: '/images/steps/ia-createur-step1.png',
        expectedResult: 'Interface IA Créateur avec champ de description',
        commonErrors: []
      },
      {
        number: 2,
        title: 'Écrire la Description',
        duration: '30 secondes',
        actions: [
          'Décrivez votre image en détail en français',
          'Soyez précis : style, couleurs, éléments, ambiance',
          'Exemple : "Un logo moderne pour une application de livraison, couleurs vertes et oranges, style minimaliste, fond blanc"',
          'Ou utilisez un template pré-fait'
        ],
        screenshot: '/images/steps/ia-createur-step2.png',
        expectedResult: 'Description entrée, bouton "Générer" actif',
        commonErrors: [
          {
            error: 'Description trop vague',
            solution: 'Ajoutez des détails : couleurs, style, ambiance. Plus c\'est précis, meilleur est le résultat.'
          }
        ]
      },
      {
        number: 3,
        title: 'Choisir le Style',
        duration: '20 secondes',
        actions: [
          'Sélectionnez un style dans le menu déroulant',
          'Options : Réaliste, Illustration, 3D, Cartoon, Aquarelle, Pixel Art, Art Africain...',
          'Pré-visualisez avec les exemples',
          'Ou laissez "Auto" pour que l\'IA choisisse'
        ],
        screenshot: '/images/steps/ia-createur-step3.png',
        expectedResult: 'Style sélectionné, prêt à générer',
        commonErrors: []
      },
      {
        number: 4,
        title: 'Générer l\'Image',
        duration: '30 secondes',
        actions: [
          'Cliquez "Générer"',
          'Attendez la génération (10-30 secondes)',
          'Barre de progression affichée'
        ],
        screenshot: '/images/steps/ia-createur-step4.png',
        expectedResult: 'Image générée et affichée',
        commonErrors: [
          {
            error: 'Génération échouée',
            solution: 'Reformulez la description en évitant les termes sensibles. Réessayez en simplifiant.'
          }
        ]
      },
      {
        number: 5,
        title: 'Évaluer et Itérer',
        duration: '1 minute',
        actions: [
          'Examinez l\'image générée',
          'Si pas satisfait : cliquez "Générer Variations" pour 4 nouvelles versions',
          'Ou cliquez "Modifier" et ajoutez un prompt de modification (ex: "Rends le ciel plus bleu")',
          'Répétez jusqu\'à satisfaction'
        ],
        screenshot: '/images/steps/ia-createur-step5.png',
        expectedResult: 'Image parfaite selon vos attentes',
        commonErrors: []
      },
      {
        number: 6,
        title: 'Éditer (Optionnel)',
        duration: '30 secondes',
        actions: [
          'Cliquez "Éditer"',
          'Options : Supprimer fond, Upscale HD, Ajouter texte, Appliquer filtres',
          'Appliquez les modifications souhaitées'
        ],
        screenshot: '/images/steps/ia-createur-step6.png',
        expectedResult: 'Image éditée selon vos besoins',
        commonErrors: []
      },
      {
        number: 7,
        title: 'Télécharger & Utiliser',
        duration: '10 secondes',
        actions: [
          'Cliquez "Télécharger"',
          'Choisissez le format : PNG (transparent), JPG (web), SVG (vectoriel si applicable)',
          'Sélectionnez la qualité : Standard (web), HD (print)',
          'Téléchargement automatique'
        ],
        screenshot: '/images/steps/ia-createur-step7.png',
        expectedResult: 'Image téléchargée, prête à utiliser dans vos campagnes',
        commonErrors: []
      }
    ],
    finalResult: {
      description: 'Vous avez généré une image professionnelle en 3 minutes sans aucune compétence en design ! L\'image est prête à être utilisée sur vos réseaux sociaux, site web, publicités, ou documents print.',
      metrics: [
        'Temps de création : 3 minutes (vs 2-5h designer)',
        'Coût : inclus (vs 10 000-50 000 FCFA/image)',
        'Qualité : HD professionnelle',
        'Variations : Illimitées'
      ]
    }
  },
  
  useCases: [
    {
      sector: 'E-commerce',
      icon: '🛒',
      problem: 'Besoin de 50 images produits sur fond blanc pour catalogue, budget graphiste insuffisant (200 000 FCFA).',
      solution: 'Upload photos produits, suppression fond automatique, génération visuels lifestyle avec IA.',
      result: 'Catalogue complet en 2h au lieu de 2 semaines, économie 195 000 FCFA, ventes +40%',
      testimonial: {
        quote: 'J\'ai créé 80 visuels produits en un après-midi. Avant ça me coûtait 300 000 FCFA.',
        author: 'Yves K.',
        company: 'BéninShop Pro'
      }
    },
    {
      sector: 'Agences Marketing',
      icon: '📱',
      problem: 'Clients demandent 10-15 variations de visuels pour tests A/B, coût et temps graphistes explosent.',
      solution: 'Génération automatique de variations avec IA Créateur, tests rapides, sélection des plus performantes.',
      result: 'Production x5, coûts graphisme -70%, performances campagnes +60% grâce aux tests',
      testimonial: {
        quote: 'On teste maintenant 20 visuels par campagne au lieu de 3. Les résultats ont doublé.',
        author: 'Maryse D.',
        company: 'Pixel Agency'
      }
    },
    {
      sector: 'Créateurs de Contenu',
      icon: '✍️',
      problem: 'Besoin de visuels quotidiens pour posts réseaux sociaux, impossible de payer designer chaque jour.',
      solution: 'Génération quotidienne de visuels avec templates Instagram/LinkedIn, cohérence visuelle maintenue.',
      result: 'Post quotidien avec visuels pro, croissance abonnés +200%, économie 80 000 FCFA/mois',
      testimonial: {
        quote: 'Je crée mes visuels en 5 min avant chaque post. Ma communauté a explosé.',
        author: 'Aïcha B.',
        company: 'Influenceuse Tech'
      }
    }
  ],
  
  roi: {
    metricsComparison: [
      {
        metric: 'Coût par visuel',
        before: '10 000-50 000 FCFA (graphiste)',
        after: '0 FCFA (inclus)',
        improvement: '-100%'
      },
      {
        metric: 'Temps de création',
        before: '2-5 heures',
        after: '3 minutes',
        improvement: '-98%'
      },
      {
        metric: 'Nombre de variations testables',
        before: '2-3 (limite budget)',
        after: 'Illimité',
        improvement: '+∞'
      },
      {
        metric: 'Délai livraison visuel',
        before: '2-7 jours',
        after: '3 minutes',
        improvement: '-99.9%'
      }
    ],
    investment: {
      monthlyPrice: 3000,
      setupTime: '0 minute',
      totalYearOne: 36000
    },
    gains: {
      labourSavings: 1800000,
      revenueIncrease: 600000,
      totalYearOne: 2400000
    },
    roiPercentage: 6567,
    paybackPeriod: '5 jours'
  },
  
  pricing: {
    plansComparison: [
      {
        plan: 'Découverte',
        price: 0,
        included: true,
        limits: '10 générations/mois'
      },
      {
        plan: 'Essentiel',
        price: 3000,
        included: true,
        limits: '100 générations/mois'
      },
      {
        plan: 'Professionnel',
        price: 5000,
        included: true,
        limits: '500 générations/mois'
      },
      {
        plan: 'Ventes',
        price: 15000,
        included: true,
        limits: 'Générations illimitées'
      }
    ],
    recommendation: 'Pack Essentiel recommandé pour la plupart des utilisateurs. Gratuit pour tester avec 10 générations/mois.'
  },
  
  faq: [
    {
      question: 'Puis-je utiliser les images générées commercialement ?',
      answer: 'Oui ! Vous avez les droits commerciaux complets sur toutes les images générées via Bot.bj. Utilisez-les librement : site web, publicités, réseaux sociaux, print, revente. Seule restriction : ne pas revendre l\'image "telle quelle" comme produit digital (ex: vendre sur marketplace de photos).'
    },
    {
      question: 'Quelle est la qualité des images ?',
      answer: 'Résolution standard : 1024x1024px (parfait web/réseaux sociaux). Upscale HD disponible jusqu\'à 4096x4096px pour print grand format. Qualité professionnelle, indiscernable d\'une création humaine dans 90% des cas. Formats : PNG, JPG, WebP.'
    },
    {
      question: 'Combien de temps prend la génération ?',
      answer: '10-30 secondes selon la complexité. Images simples (logos, icônes) : 10-15s. Images complexes (scènes détaillées, personnages multiples) : 20-30s. En heures de pointe, peut aller jusqu\'à 60s.'
    },
    {
      question: 'Puis-je générer des images de personnes réelles ?',
      answer: 'Vous pouvez générer des portraits de personnes fictives (créées par IA, n\'existent pas). INTERDIT : générer des images de personnes réelles identifiables (célébrités, personnes nommées) sans permission. Violations = suspension compte.'
    },
    {
      question: 'Comment améliorer la qualité de mes prompts ?',
      answer: 'Soyez précis et détaillé. Bon prompt : "Un logo circulaire pour café, couleurs marron et beige, grains de café stylisés, typographie moderne, fond transparent". Mauvais : "logo café". Incluez : style, couleurs, éléments, ambiance, contexte. L\'IA propose des suggestions de prompts.'
    },
    {
      question: 'Puis-je éditer une image générée avec mes propres outils ?',
      answer: 'Oui ! Téléchargez en PNG ou JPG et éditez avec Photoshop, Canva, GIMP, etc. Vous pouvez aussi re-uploader l\'image éditée dans IA Créateur pour générer des variations basées sur votre édition.'
    },
    {
      question: 'Les images sont-elles uniques ou utilisées par d\'autres ?',
      answer: 'Chaque génération est unique grâce au caractère aléatoire de l\'IA. Probabilité qu\'une autre personne génère la même image : <0.001%. Pour garantir unicité absolue, ajoutez des détails très spécifiques à votre marque dans le prompt.'
    },
    {
      question: 'Y a-t-il des restrictions sur le contenu générable ?',
      answer: 'Oui, politiques strictes : INTERDIT violence, nudité, contenus offensants, personnes réelles identifiables, marques déposées (logos Nike, Apple...), contenu illégal. L\'IA filtre automatiquement. Violations répétées = suspension.'
    },
    {
      question: 'Puis-je générer des illustrations pour enfants ?',
      answer: 'Oui ! Sélectionnez le style "Cartoon" ou "Illustration Enfants". Parfait pour livres, jeux éducatifs, apps pour enfants. Assurez-vous que le contenu reste approprié (pas de violence même dessinée).'
    },
    {
      question: 'Comment fonctionne la suppression de fond ?',
      answer: 'IA de segmentation détecte automatiquement le sujet principal et retire l\'arrière-plan. Export en PNG transparent. Fonctionne sur photos, illustrations, logos. Précision 95%+. Utile pour e-commerce, mockups, compositions.'
    }
  ],
  
  resources: [
    {
      type: 'Guide Complet',
      description: 'Documentation IA Créateur 18 pages',
      format: 'PDF',
      size: '4.5 MB',
      url: '/downloads/ia-createur-guide.pdf'
    },
    {
      type: 'Vidéo Tutoriel',
      description: 'Créer des visuels professionnels (15 min)',
      format: 'MP4',
      size: '60 MB',
      url: '/videos/ia-createur-tutorial.mp4'
    },
    {
      type: 'Prompts Library',
      description: 'Bibliothèque de 100 prompts efficaces',
      format: 'PDF',
      size: '1.8 MB',
      url: '/downloads/ia-createur-prompts-library.pdf'
    },
    {
      type: 'Templates Pack',
      description: 'Pack de 50 templates pré-configurés',
      format: 'ZIP',
      size: '12 MB',
      url: '/downloads/ia-createur-templates.zip'
    }
  ],
  
  metadata: {
    difficulty: 'débutant',
    estimatedSetupTime: '0 minute',
    minimumPlan: 'Découverte (Gratuit - 10 générations)',
    integrations: ['DALL-E 3', 'Midjourney', 'Stable Diffusion', 'Remove.bg', 'Canva'],
    tags: ['IA', 'images', 'design', 'visuels', 'marketing', 'créatif', 'génération', 'automatisation']
  }
};
