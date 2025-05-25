
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
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Briefcase className="w-8 h-8 text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Agent IA Business</h1>
          </div>
          <p className="text-slate-300 text-lg">
            Automatisez vos processus commerciaux et optimisez votre gestion client avec l'intelligence artificielle.
          </p>
        </div>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Actions rapides</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto flex-col">
              <Plus className="w-6 h-6 mb-2" />
              <span>Nouveau contact</span>
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto flex-col">
              <FileText className="w-6 h-6 mb-2" />
              <span>Générer devis</span>
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white p-4 h-auto flex-col">
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>Analyse des ventes</span>
            </Button>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="text-slate-400 mb-4">{feature.description}</p>
              <div className="space-y-2">
                {feature.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    variant="outline"
                    className="w-full text-left justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
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
