// Sector templates for the WAOUH AI Agent wizard.
// Each template pre-fills the persona, capabilities and starter FAQ.

export type SectorTemplate = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  persona: { name: string; tone: string; emojis: boolean };
  capabilities: { qa: boolean; sell: boolean; appointments: boolean; qualify: boolean; handoff: boolean };
  starter_faq: Array<{ q: string; a: string }>;
  sample_products: Array<{ name: string; price_fcfa?: number; description?: string }>;
};

export const SECTOR_TEMPLATES: SectorTemplate[] = [
  {
    id: "commerce",
    label: "Boutique / Commerce",
    emoji: "🛍️",
    description: "Vente de produits, gestion du catalogue, commandes.",
    persona: { name: "Ami·e du magasin", tone: "chaleureux et vendeur", emojis: true },
    capabilities: { qa: true, sell: true, appointments: false, qualify: true, handoff: true },
    starter_faq: [
      { q: "Livrez-vous à domicile ?", a: "Oui, livraison partout à Cotonou dès 1 000 FCFA. 🚚" },
      { q: "Quels sont vos horaires ?", a: "Du lundi au samedi, de 9h à 20h." },
    ],
    sample_products: [
      { name: "Robe wax", price_fcfa: 15000, description: "Taille S/M/L" },
    ],
  },
  {
    id: "restauration",
    label: "Restaurant / Food",
    emoji: "🍽️",
    description: "Menu, commandes, réservations de table.",
    persona: { name: "Serveur virtuel", tone: "gourmand et accueillant", emojis: true },
    capabilities: { qa: true, sell: true, appointments: true, qualify: false, handoff: true },
    starter_faq: [
      { q: "Vous livrez ?", a: "Oui, livraison en 30 min autour du restaurant. 🛵" },
    ],
    sample_products: [
      { name: "Poulet braisé + attiéké", price_fcfa: 3500 },
    ],
  },
  {
    id: "sante",
    label: "Santé / Bien-être",
    emoji: "🩺",
    description: "Prise de rendez-vous, consultation d'informations.",
    persona: { name: "Assistant santé", tone: "professionnel et rassurant", emojis: false },
    capabilities: { qa: true, sell: false, appointments: true, qualify: true, handoff: true },
    starter_faq: [
      { q: "Quels sont vos tarifs ?", a: "Consultation à partir de 5 000 FCFA. Un praticien vous confirmera le devis." },
    ],
    sample_products: [],
  },
  {
    id: "services",
    label: "Services / Freelance",
    emoji: "💼",
    description: "Devis, prestations, prise de contact.",
    persona: { name: "Assistant pro", tone: "sérieux et efficace", emojis: false },
    capabilities: { qa: true, sell: false, appointments: true, qualify: true, handoff: true },
    starter_faq: [
      { q: "Comment ça marche ?", a: "Décrivez-moi votre besoin, je vous propose un devis sous 24h." },
    ],
    sample_products: [],
  },
  {
    id: "education",
    label: "Éducation / Formation",
    emoji: "🎓",
    description: "Inscriptions, planning des cours, tarifs.",
    persona: { name: "Assistant scolaire", tone: "pédagogue", emojis: true },
    capabilities: { qa: true, sell: true, appointments: true, qualify: true, handoff: true },
    starter_faq: [
      { q: "Comment m'inscrire ?", a: "Envoyez-moi vos nom, prénom et niveau. Je vous envoie le formulaire." },
    ],
    sample_products: [
      { name: "Cours particulier / heure", price_fcfa: 5000 },
    ],
  },
  {
    id: "other",
    label: "Autre secteur",
    emoji: "✨",
    description: "Assistant générique, à personnaliser.",
    persona: { name: "Assistant", tone: "friendly", emojis: true },
    capabilities: { qa: true, sell: false, appointments: false, qualify: false, handoff: true },
    starter_faq: [],
    sample_products: [],
  },
];
