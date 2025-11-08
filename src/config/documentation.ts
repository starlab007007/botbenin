export interface DocumentMetadata {
  id: string;
  title: string;
  category: string;
  file: string;
  description: string;
  icon: string;
  public: boolean;
  lastUpdated?: string;
}

export const documentationIndex: DocumentMetadata[] = [
  {
    id: 'corrections-summary',
    title: 'Résumé des Corrections',
    category: 'Analyses & Rapports',
    file: '/docs/CORRECTIONS_SUMMARY.md',
    description: 'Résumé des corrections appliquées à la plateforme',
    icon: '✅',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'platform-analysis',
    title: 'Analyse Complète de la Plateforme',
    category: 'Analyses & Rapports',
    file: '/docs/PLATFORM_ANALYSIS_REPORT.md',
    description: 'Rapport d\'analyse détaillée de la plateforme',
    icon: '📊',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'xss-protection',
    title: 'Guide de Protection XSS',
    category: 'Sécurité',
    file: '/docs/XSS_PROTECTION_GUIDE.md',
    description: 'Guide complet pour protéger l\'application contre les attaques XSS',
    icon: '🔒',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'accessibility-fixes',
    title: 'Corrections d\'Accessibilité',
    category: 'Sécurité',
    file: '/docs/ACCESSIBILITY_FIXES_NEEDED.md',
    description: 'Liste des corrections nécessaires pour améliorer l\'accessibilité',
    icon: '♿',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'search-actions',
    title: 'Guide des Actions de Recherche',
    category: 'Marketing & SEO',
    file: '/docs/SEARCH_ACTIONS_GUIDE.md',
    description: 'Stratégies et actions pour optimiser le référencement',
    icon: '🔍',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'seo-external',
    title: 'Actions SEO Externes',
    category: 'Marketing & SEO',
    file: '/docs/SEO_EXTERNAL_ACTIONS_GUIDE.md',
    description: 'Guide des actions SEO externes et netlinking',
    icon: '🌐',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'marketing-visuals',
    title: 'Guide des Visuels Marketing',
    category: 'Marketing & SEO',
    file: '/docs/VISUELS_MARKETING_GUIDE.md',
    description: 'Recommandations pour les visuels et contenus marketing',
    icon: '🎨',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'marketing-launch',
    title: 'Plan de Lancement Marketing',
    category: 'Marketing & SEO',
    file: '/docs/LANCEMENT_MARKETING_BOT_BJ.md',
    description: 'Stratégie complète de lancement marketing',
    icon: '🚀',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'technical-optimizations',
    title: 'Optimisations Techniques',
    category: 'Technique',
    file: '/docs/TECHNICAL_OPTIMIZATIONS_GUIDE.md',
    description: 'Guide des optimisations techniques à implémenter',
    icon: '⚙️',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'frontend-backend',
    title: 'Intégration Frontend-Backend',
    category: 'Technique',
    file: '/docs/FRONTEND_BACKEND_INTEGRATION_REPORT.md',
    description: 'Rapport sur l\'intégration entre frontend et backend',
    icon: '🔗',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'phase-2-robustesse',
    title: 'Phase 2: Robustesse',
    category: 'Technique',
    file: '/docs/PHASE_2_ROBUSTESSE.md',
    description: 'Plan pour améliorer la robustesse de la plateforme',
    icon: '💪',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'tests-production',
    title: 'Rapport de Tests en Production',
    category: 'Analyses & Rapports',
    file: '/docs/RAPPORT_TESTS_PRODUCTION.md',
    description: 'Résultats des tests effectués en production',
    icon: '🧪',
    public: false,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'commercial-doc',
    title: 'Document Commercial Bot BJ',
    category: 'Analyses & Rapports',
    file: '/docs/DOCUMENT_COMMERCIAL_BOT_BJ.md',
    description: 'Documentation commerciale de la plateforme',
    icon: '💼',
    public: true,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'readme',
    title: 'Documentation Générale',
    category: 'Documentation',
    file: '/docs/README.md',
    description: 'Documentation générale du projet',
    icon: '📚',
    public: true,
    lastUpdated: '2025-01-08'
  }
];

export const categories = Array.from(
  new Set(documentationIndex.map(doc => doc.category))
);
