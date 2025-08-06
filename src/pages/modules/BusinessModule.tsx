
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type ViewMode = 'menu' | 'ciblage-b2b' | 'ciblage-b2b-complet' | 'prospection-locale' | 'scoring-leads' | 'listes-prospects' | 'campagnes-engagement';

export const BusinessModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('menu');

  const businessOptions = [
    {
      id: 'ciblage-b2b-complet',
      title: "Workflow B2B Complet",
      description: "Processus intégré : sélection des critères intelligents, recherche via webhook, affichage des résultats et visualisation sur carte interactive.",
      icon: Users,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'ciblage-b2b',
      title: "Ciblage B2B (Version Simple)",
      description: "Version basique du ciblage B2B pour tester les fonctionnalités de recherche et d'affichage des contacts professionnels.",
      icon: Target,
      color: 'bg-cyan-100',
      iconColor: 'text-cyan-600'
    },
    {
      id: 'prospection-locale',
      title: "Prospection Locale",
      description: "Découvrez et ciblez des entreprises locales par secteur d'activité et zone géographique pour développer votre clientèle de proximité.",
      icon: MapPin,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'scoring-leads',
      title: "Scoring & Qualification des Leads",
      description: "Évaluez et priorisez automatiquement vos prospects en leur attribuant un score basé sur leur profil et leur potentiel pour votre chatbot.",
      icon: Target,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'listes-prospects',
      title: "Mes Listes de Prospects (Import)",
      description: "Importez, gérez et enrichissez vos listes de contacts existantes au format CSV pour les intégrer à vos actions de prospection.",
      icon: Upload,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'campagnes-engagement',
      title: "Campagnes & Modèles d'Engagement",
      description: "Créez des modèles, générez des messages personnalisés par IA (e-mails, WhatsApp) et gérez vos campagnes pour engager efficacement vos prospects.",
      icon: MessageSquare,
      color: 'bg-red-100',
      iconColor: 'text-red-600'
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

  if (currentView === 'ciblage-b2b') {
    return <B2BTargeting onBack={handleBackToMenu} />;
  }

  if (currentView === 'prospection-locale') {
    return <LocalProspecting onBack={handleBackToMenu} />;
  }

  if (currentView === 'scoring-leads') {
    return <LeadQualificationMenu onBack={handleBackToMenu} />;
  }

  if (currentView === 'listes-prospects') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={handleBackToMenu} className="mb-6">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour au menu
          </Button>
          <Card className="p-8 text-center">
            <Upload className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h2 className="text-2xl font-bold mb-4">Mes Listes de Prospects (Import)</h2>
            <p className="text-gray-600 mb-6">Cette fonctionnalité sera bientôt disponible.</p>
            <p className="text-sm text-gray-500">Import et enrichissement de vos listes de contacts existantes.</p>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'campagnes-engagement') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={handleBackToMenu} className="mb-6">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour au menu
          </Button>
          <Card className="p-8 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold mb-4">Campagnes & Modèles d'Engagement</h2>
            <p className="text-gray-600 mb-6">Cette fonctionnalité sera bientôt disponible.</p>
            <p className="text-sm text-gray-500">Création de campagnes personnalisées avec IA pour l'engagement client.</p>
          </Card>
        </div>
      </div>
    );
  }

  // Default menu view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Agent IA Business</h1>
            <p className="text-gray-600 text-lg">
              Choisissez une option pour commencer votre projet business
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {businessOptions.map((option) => (
            <Card 
              key={option.id}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group h-full"
              onClick={() => handleOptionSelect(option.id)}
            >
              <div className="flex flex-col items-center text-center space-y-4 h-full">
                <div className={`w-16 h-16 ${option.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <option.icon className={`w-8 h-8 ${option.iconColor}`} />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {option.description}
                  </p>
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-12">
          <p className="text-gray-500 text-sm">
            Sélectionnez une option ci-dessus pour commencer votre projet business
          </p>
        </div>
      </div>
    </div>
  );
};
