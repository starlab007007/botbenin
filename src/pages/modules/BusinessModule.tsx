
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  Target, 
  Upload, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { B2BTargeting } from '@/components/business/B2BTargeting';
import { LocalProspecting } from '@/components/business/LocalProspecting';
import { CompleteB2BWorkflow } from '@/components/business/CompleteB2BWorkflow';
import { LeadQualificationWorkflow } from '@/components/business/LeadQualificationWorkflow';
import { LeadQualificationMenu } from '@/components/business/LeadQualificationMenu';
import { IntelligentProspectImporter } from '@/components/business/IntelligentProspectImporter';
import { CampaignEngagementManager } from '@/components/business/CampaignEngagementManager';

type ViewMode = 'menu' | 'ciblage-b2b-complet' | 'scoring-leads' | 'listes-prospects' | 'campagnes-engagement';

export const BusinessModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('menu');

  const businessOptions = [
    {
      id: 'ciblage-b2b-complet',
      title: "Recherche B2B Intelligente",
      description: "Trouvez des entreprises ciblées grâce à l'IA : définissez vos critères (localisation, secteur, taille), lancez la recherche via webhook et visualisez vos prospects sur une carte interactive avec toutes leurs coordonnées.",
      details: "Workflow complet en 4 étapes : critères → recherche → résultats → visualisation",
      icon: Users,
      color: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      badge: 'Recommandé'
    },
    {
      id: 'scoring-leads',
      title: "Scoring & Qualification des Leads",
      description: "Évaluez automatiquement la qualité de vos prospects grâce à l'IA. Obtenez un score de qualification basé sur leur profil, leur potentiel et leur adéquation avec votre offre pour prioriser vos actions commerciales.",
      details: "Analyse IA + scoring automatique + priorisation",
      icon: Target,
      color: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconColor: 'text-orange-600',
      badge: 'IA Avancée'
    },
    {
      id: 'listes-prospects',
      title: "Import & Gestion de Prospects",
      description: "Importez vos listes existantes (CSV, Google Sheets) et enrichissez-les automatiquement avec des données supplémentaires. Centralisez tous vos contacts pour une gestion efficace de votre prospection.",
      details: "Import CSV/Sheets + enrichissement automatique",
      icon: Upload,
      color: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      badge: 'Pratique'
    },
    {
      id: 'campagnes-engagement',
      title: "Campagnes d'Engagement",
      description: "Créez des campagnes personnalisées avec l'IA : générez automatiquement des messages adaptés (e-mails, WhatsApp), programmez vos envois et suivez les performances de vos actions marketing.",
      details: "Génération IA + multi-canal + suivi",
      icon: MessageSquare,
      color: 'bg-gradient-to-br from-red-50 to-red-100',
      iconColor: 'text-red-600',
      badge: 'Nouveau'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setCurrentView(optionId as ViewMode);
    console.log('Option sélectionnée:', optionId);
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  // Render different views based on current selection
  if (currentView === 'ciblage-b2b-complet') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <CompleteB2BWorkflow onBack={handleBackToMenu} />
        </div>
      </div>
    );
  }

  if (currentView === 'scoring-leads') {
    return <LeadQualificationMenu onBack={handleBackToMenu} />;
  }

  if (currentView === 'listes-prospects') {
    return <IntelligentProspectImporter onBack={handleBackToMenu} />;
  }

  if (currentView === 'campagnes-engagement') {
    return <CampaignEngagementManager onBack={handleBackToMenu} />;
  }

  // Default menu view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-10 border border-gray-200">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-2">
              <Target className="w-4 h-4" />
              Outils de Prospection Intelligente
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Agent IA Business
            </h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Boostez votre prospection avec l'intelligence artificielle : trouvez, qualifiez et engagez vos prospects B2B de manière automatisée
            </p>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Recherche ciblée</h3>
                <p className="text-sm text-gray-600">Trouvez les bonnes entreprises avec des critères précis</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Qualification IA</h3>
                <p className="text-sm text-gray-600">Priorisez vos prospects selon leur potentiel</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-pink-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-pink-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Engagement automatisé</h3>
                <p className="text-sm text-gray-600">Créez des campagnes personnalisées par IA</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Guide Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Comment ça marche ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mb-3">1</div>
              <h3 className="font-semibold mb-2">Recherchez</h3>
              <p className="text-sm text-white/90">Définissez vos critères et trouvez des prospects qualifiés</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mb-3">2</div>
              <h3 className="font-semibold mb-2">Qualifiez</h3>
              <p className="text-sm text-white/90">L'IA analyse et score vos prospects automatiquement</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mb-3">3</div>
              <h3 className="font-semibold mb-2">Organisez</h3>
              <p className="text-sm text-white/90">Importez et gérez vos listes de contacts</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mb-3">4</div>
              <h3 className="font-semibold mb-2">Engagez</h3>
              <p className="text-sm text-white/90">Lancez des campagnes personnalisées multi-canaux</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Choisissez votre outil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {businessOptions.map((option) => (
              <Card 
                key={option.id}
                className="p-8 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group"
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-16 h-16 ${option.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md`}>
                      <option.icon className={`w-8 h-8 ${option.iconColor}`} />
                    </div>
                    {option.badge && (
                      <Badge 
                        variant={option.badge === 'Bientôt' ? 'secondary' : 'default'}
                        className={option.badge === 'Recommandé' ? 'bg-blue-600' : option.badge === 'IA Avancée' ? 'bg-orange-600' : ''}
                      >
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {option.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {option.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span>{option.details}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      Commencer →
                    </span>
                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-0">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Besoin d'aide pour démarrer ?</h3>
              <p className="text-gray-600 text-sm mb-3">
                Nous recommandons de commencer par la <span className="font-semibold text-blue-600">Recherche B2B Intelligente</span> pour trouver vos premiers prospects, 
                puis d'utiliser le <span className="font-semibold text-orange-600">Scoring & Qualification</span> pour les prioriser.
              </p>
              <p className="text-gray-500 text-xs">
                💡 Astuce : Vous pouvez exporter vos résultats à tout moment au format CSV
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
