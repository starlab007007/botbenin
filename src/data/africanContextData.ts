export const africanContext = {
  greetings: {
    fr: ['Bonjour', 'Bienvenue', 'Salut'],
    fon: ['Akpé', 'Kouto'], // Langue fon du Bénin
    general: ['Cher client', 'Patron', 'Boss']
  },
  
  businessTypes: [
    'Maquis',
    'Restaurant',
    'Boutique',
    'Salon de coiffure',
    'Buvette',
    'Magasin',
    'Pharmacie',
    'Quincaillerie',
    'Superette',
    'Atelier',
    'Garage',
    'Hôtel'
  ],
  
  locations: {
    benin: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon', 'Djougou'],
    landmarks: ['Marché Dantokpa', 'Fidjrossè', 'Akpakpa', 'Godomey', 'Cadjèhoun']
  },
  
  currency: {
    code: 'XOF',
    symbol: 'CFA',
    locale: 'fr-BJ',
    format: (amount: number) => `${amount.toLocaleString('fr-BJ')} CFA`
  },
  
  contact: {
    phone: '+229 47 33 32 89',
    phoneFormatted: '+229 47 33 32 89',
    whatsapp: 'wa.me/22947333289',
    website: 'bot.bj'
  },
  
  paymentMethods: [
    { name: 'MTN Money', logo: '📱', color: '#FFCC00' },
    { name: 'Moov Money', logo: '💳', color: '#009FE3' },
    { name: 'SBIN', logo: '🏦', color: '#10B981' }
  ],
  
  culturalElements: {
    expressions: [
      'On est ensemble',
      'Ça va aller',
      'Petit à petit',
      'C\'est bon là',
      'On fait comment?'
    ],
    values: ['Communauté', 'Solidarité', 'Entrepreneuriat', 'Innovation']
  },
  
  visualContext: {
    settings: [
      'Marché animé avec vendeurs',
      'Boutique moderne à Cotonou',
      'Restaurant local béninois',
      'Bureau avec entrepreneur africain',
      'Maquis populaire',
      'Commerce de rue dynamique'
    ],
    people: [
      'Entrepreneur béninois souriant',
      'Vendeuse en tenue africaine',
      'Jeune professionnel avec smartphone',
      'Commerçant dans son magasin',
      'Équipe diverse africaine'
    ]
  },
  
  pricing: {
    starter: { amount: 2500, name: 'Starter' },
    standard: { amount: 7500, name: 'Standard' },
    premium: { amount: 12500, name: 'Premium' },
    business: { amount: 15000, name: 'Business' },
    enterprise: { amount: 25000, name: 'Enterprise' }
  }
};

export const getContextualPromptEnhancement = (basePrompt: string): string => {
  return `${basePrompt}

CONTEXTE AFRICAIN/BÉNINOIS OBLIGATOIRE:
- Personnages: Africains diversifiés (Béninois, Ouest-Africains)
- Décor: Environnement urbain béninois (${africanContext.locations.benin.join(', ')})
- Commerce: ${africanContext.businessTypes.slice(0, 3).join(', ')}
- Couleurs: Vives et chaleureuses, reflets de l'Afrique
- Textes: UNIQUEMENT en français
- Devise: TOUJOURS CFA, JAMAIS euros/dollars
- Éviter: Contextes européens/américains, personnes non-africaines
- Style: Moderne mais authentique, professionnel mais chaleureux
- Éléments: Smartphones, commerce moderne africain, entrepreneurs locaux`;
};
