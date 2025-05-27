
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Building2, 
  Mail, 
  Briefcase, 
  MapPin, 
  Upload, 
  FileText,
  ArrowRight
} from 'lucide-react';

export const BusinessModule: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const businessOptions = [
    {
      id: 'find-people',
      title: "Trouver et enrichir des personnes",
      description: "Filtrer par titre de poste, entreprise, localisation, et plus encore.",
      icon: Users,
      color: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      id: 'find-accounts',
      title: "Trouver et enrichir des comptes",
      description: "Filtrer par secteur, taille, mots-clés et plus encore.",
      icon: Building2,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'draft-emails',
      title: "Rédiger des emails avec l'IA",
      description: "Trouver des entreprises et générer des emails personnalisés avec l'IA.",
      icon: Mail,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'find-jobs',
      title: "Trouver des emplois",
      description: "Filtrer par titre, description, localisation, et plus encore.",
      icon: Briefcase,
      color: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      id: 'find-local-businesses',
      title: "Trouver des entreprises locales",
      description: "En utilisant Google Maps, accéder aux avis, adresses, et plus encore.",
      icon: MapPin,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'import-csv',
      title: "Importer depuis CSV",
      description: "Télécharger un fichier CSV pour créer un tableau avec vos données.",
      icon: Upload,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'use-template',
      title: "Utiliser un modèle",
      description: "Commencer avec l'un de nos modèles pré-construits.",
      icon: FileText,
      color: 'bg-cyan-100',
      iconColor: 'text-cyan-600'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    console.log('Option sélectionnée:', optionId);
    // Ici vous pouvez ajouter la logique pour traiter l'option sélectionnée
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
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

        {/* Selected Option Indicator */}
        {selectedOption && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">Option sélectionnée :</h3>
                <p className="text-blue-800">
                  {businessOptions.find(opt => opt.id === selectedOption)?.title}
                </p>
              </div>
              <Button 
                onClick={() => setSelectedOption(null)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        )}

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
