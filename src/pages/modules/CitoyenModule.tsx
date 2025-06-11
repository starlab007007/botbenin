
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users as UsersIcon, 
  MessageCircle, 
  FileSearch, 
  Calendar, 
  MapPin, 
  Info,
  ArrowRight,
  Phone,
  Globe,
  Heart
} from 'lucide-react';

type ViewMode = 'menu' | 'assistance' | 'demarches' | 'rdv' | 'services' | 'urgences' | 'infos';

export const CitoyenModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('menu');

  const citoyenOptions = [
    {
      id: 'assistance',
      title: "Assistant Citoyen IA",
      description: "Obtenez une assistance personnalisée pour vos questions administratives, démarches et droits civiques avec l'IA.",
      icon: MessageCircle,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'demarches',
      title: "Démarches Administratives",
      description: "Simplifiez vos démarches : état civil, urbanisme, taxes, permis et formulaires en ligne avec guide interactif.",
      icon: FileSearch,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'rdv',
      title: "Prise de Rendez-vous",
      description: "Prenez rendez-vous en ligne avec les services municipaux, préfecture, ou administrations publiques.",
      icon: Calendar,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'services',
      title: "Services de Proximité",
      description: "Trouvez les services publics près de chez vous : mairie, bibliothèques, centres sociaux, transports.",
      icon: MapPin,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'urgences',
      title: "Urgences & Contacts",
      description: "Accès rapide aux numéros d'urgence, services d'aide et contacts essentiels des administrations.",
      icon: Phone,
      color: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      id: 'infos',
      title: "Informations Citoyennes",
      description: "Actualités locales, avis publics, événements communautaires et informations pratiques pour les citoyens.",
      icon: Info,
      color: 'bg-teal-100',
      iconColor: 'text-teal-600'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setCurrentView(optionId as ViewMode);
    console.log('Option citoyen sélectionnée:', optionId);
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  // Render different views based on current selection
  if (currentView !== 'menu') {
    const selectedOption = citoyenOptions.find(opt => opt.id === currentView);
    
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
                    <Globe className="w-8 h-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-blue-800">Accessible 24/7</h3>
                    <p className="text-sm text-blue-600">Service disponible en permanence</p>
                  </Card>
                  <Card className="p-4 bg-green-50 border-green-200">
                    <Heart className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="font-semibold text-green-800">Service Public</h3>
                    <p className="text-sm text-green-600">Gratuit pour tous les citoyens</p>
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
            <UsersIcon className="w-16 h-16 mx-auto mb-4 text-teal-600" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">IA Citoyen</h1>
            <p className="text-gray-600 text-lg">
              Votre assistant intelligent pour toutes vos démarches citoyennes
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {citoyenOptions.map((option) => (
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {option.description}
                  </p>
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-teal-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-12">
          <p className="text-gray-500 text-sm">
            Sélectionnez une option ci-dessus pour accéder aux services citoyens
          </p>
        </div>
      </div>
    </div>
  );
};
