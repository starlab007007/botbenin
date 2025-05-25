
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Agent IA Business</h1>
              <p className="text-gray-600 text-lg mt-1">
                Automatisez vos processus commerciaux et optimisez votre gestion client avec l'intelligence artificielle.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <Plus className="w-6 h-6 mb-2" />
              <span>Nouveau contact</span>
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <FileText className="w-6 h-6 mb-2" />
              <span>Générer devis</span>
            </Button>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>Analyse des ventes</span>
            </Button>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-3">
                  <feature.icon className="w-6 h-6 text-white" />
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
