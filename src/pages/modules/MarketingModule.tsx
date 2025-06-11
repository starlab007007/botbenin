
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Megaphone, 
  Mail, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Target,
  ArrowRight,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';

type ViewMode = 'menu' | 'email-campaigns' | 'social-media' | 'analytics' | 'automation' | 'content-creation';

export const MarketingModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('menu');

  const marketingOptions = [
    {
      id: 'email-campaigns',
      title: "Campagnes Email",
      description: "Créez et gérez vos campagnes email marketing avec des modèles personnalisables et un suivi détaillé des performances.",
      icon: Mail,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'social-media',
      title: "Réseaux Sociaux",
      description: "Programmez et publiez vos contenus sur les réseaux sociaux, gérez vos communautés et analysez l'engagement.",
      icon: MessageSquare,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'analytics',
      title: "Analytics Marketing",
      description: "Analysez les performances de vos campagnes, suivez le ROI et optimisez vos stratégies marketing.",
      icon: BarChart3,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'automation',
      title: "Automatisation Marketing",
      description: "Configurez des workflows automatisés pour nurturing, segmentation et personnalisation des parcours clients.",
      icon: Target,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'content-creation',
      title: "Création de Contenu IA",
      description: "Générez du contenu marketing optimisé avec l'IA : articles, posts sociaux, newsletters et landing pages.",
      icon: FileText,
      color: 'bg-pink-100',
      iconColor: 'text-pink-600'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setCurrentView(optionId as ViewMode);
    console.log('Option marketing sélectionnée:', optionId);
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  // Render different views based on current selection
  if (currentView !== 'menu') {
    const selectedOption = marketingOptions.find(opt => opt.id === currentView);
    
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={handleBackToMenu} className="mb-6">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour au menu
          </Button>
          <Card className="p-8 text-center">
            {selectedOption && (
              <>
                <selectedOption.icon className={`w-16 h-16 mx-auto mb-4 ${selectedOption.iconColor}`} />
                <h2 className="text-2xl font-bold mb-4">{selectedOption.title}</h2>
                <p className="text-gray-600 mb-6">{selectedOption.description}</p>
                <p className="text-sm text-gray-500">Cette fonctionnalité sera bientôt disponible.</p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-blue-800">Optimisation IA</h3>
                    <p className="text-sm text-blue-600">Algorithmes d'optimisation automatique</p>
                  </Card>
                  <Card className="p-4 bg-green-50 border-green-200">
                    <Calendar className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="font-semibold text-green-800">Planning Intelligent</h3>
                    <p className="text-sm text-green-600">Programmation automatique optimale</p>
                  </Card>
                </div>
              </>
            )}
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
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-pink-600" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Agent IA Marketing</h1>
            <p className="text-gray-600 text-lg">
              Optimisez vos campagnes marketing avec l'intelligence artificielle
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {marketingOptions.map((option) => (
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {option.description}
                  </p>
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-pink-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-12">
          <p className="text-gray-500 text-sm">
            Sélectionnez une option ci-dessus pour commencer votre projet marketing
          </p>
        </div>
      </div>
    </div>
  );
};
