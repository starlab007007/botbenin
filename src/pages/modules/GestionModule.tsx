
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  BarChart,
  ArrowRight,
  Database,
  Settings,
  Shield
} from 'lucide-react';

type ViewMode = 'menu' | 'documents' | 'planning' | 'finances' | 'crm' | 'reporting' | 'administration';

export const GestionModule: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('menu');

  const gestionOptions = [
    {
      id: 'documents',
      title: "Gestion Documentaire",
      description: "Organisez, stockez et partagez vos documents d'entreprise avec un système de classement intelligent et de recherche avancée.",
      icon: FileText,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'planning',
      title: "Planning & Ressources",
      description: "Gérez les emplois du temps, planifiez les ressources et optimisez l'allocation des équipes et des projets.",
      icon: Calendar,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'finances',
      title: "Gestion Financière",
      description: "Suivez la comptabilité, gérez les budgets, analysez la rentabilité et automatisez la facturation.",
      icon: DollarSign,
      color: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      id: 'crm',
      title: "Relation Client (CRM)",
      description: "Centralisez les données clients, suivez les interactions et optimisez le parcours client avec l'IA.",
      icon: Users,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'reporting',
      title: "Tableaux de Bord IA",
      description: "Analysez les performances avec des rapports intelligents, KPI automatisés et insights prédictifs.",
      icon: BarChart,
      color: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      id: 'administration',
      title: "Administration Système",
      description: "Configurez les paramètres, gérez les utilisateurs, les rôles et la sécurité de votre plateforme.",
      icon: Settings,
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setCurrentView(optionId as ViewMode);
    console.log('Option gestion sélectionnée:', optionId);
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  // Render different views based on current selection
  if (currentView !== 'menu') {
    const selectedOption = gestionOptions.find(opt => opt.id === currentView);
    
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
                  <Card className="p-4 bg-indigo-50 border-indigo-200">
                    <Database className="w-8 h-8 text-indigo-600 mb-2" />
                    <h3 className="font-semibold text-indigo-800">Base de Données</h3>
                    <p className="text-sm text-indigo-600">Stockage sécurisé et structuré</p>
                  </Card>
                  <Card className="p-4 bg-green-50 border-green-200">
                    <Shield className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="font-semibold text-green-800">Sécurité Avancée</h3>
                    <p className="text-sm text-green-600">Protection et conformité RGPD</p>
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
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Agent IA Gestion</h1>
            <p className="text-gray-600 text-lg">
              Optimisez votre gestion d'entreprise avec des outils intelligents
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {gestionOptions.map((option) => (
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {option.description}
                  </p>
                </div>

                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-12">
          <p className="text-gray-500 text-sm">
            Sélectionnez une option ci-dessus pour commencer votre gestion intelligente
          </p>
        </div>
      </div>
    </div>
  );
};
