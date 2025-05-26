
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, FileText, TrendingUp, Plus } from 'lucide-react';

export const BusinessModule: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'Gestion CRM',
      description: 'Contacts, scoring et tracking des leads automatisé',
      actions: ['Ajouter un contact', 'Scorer les leads', 'Suivi automatique']
    },
    {
      icon: FileText,
      title: 'Génération de documents',
      description: 'PDF, contrats et propositions commerciales',
      actions: ['Créer un devis', 'Générer un contrat', 'Proposition commerciale']
    },
    {
      icon: TrendingUp,
      title: 'Analyse prédictive',
      description: 'Prévisions et analyses des performances business',
      actions: ['Analyser les tendances', 'Prédictions de vente', 'Rapport mensuel']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent IA Business</h1>
              <p className="text-gray-600 text-lg mt-1">
                Automatisez vos processus commerciaux et optimisez votre gestion client avec l'intelligence artificielle.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <Plus className="w-6 h-6 mb-2" />
              <span>Nouveau contact</span>
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <FileText className="w-6 h-6 mb-2" />
              <span>Générer devis</span>
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>Analyse des ventes</span>
            </Button>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              </div>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <div className="space-y-2">
                {feature.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    variant="outline"
                    className="w-full text-left justify-start border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
