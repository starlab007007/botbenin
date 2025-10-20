import { KnowledgeBaseTemplate } from '@/types/knowledge-base';

// Template "Autres" personnalisable
export const OTHERS_TEMPLATE: KnowledgeBaseTemplate = {
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
        { name: 'disponible', type: 'select', required: true, options: ['Oui', 'Non'] }
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
        { name: 'type', type: 'select', required: false, options: ['Politique', 'Procédure', 'Guide', 'Autre'] }
      ]
    }
  ]
};
