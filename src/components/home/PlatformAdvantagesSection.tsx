
import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, Award } from 'lucide-react';

export const PlatformAdvantagesSection: React.FC = () => {
  const platformAdvantages = [
    {
      category: "Performance",
      items: [
        "Temps de réponse < 2 secondes",
        "Disponibilité 99.9%",
        "Scalabilité automatique",
        "Infrastructure cloud premium"
      ]
    },
    {
      category: "Innovation",
      items: [
        "IA de dernière génération",
        "Mises à jour continues",
        "R&D permanente",
        "Technologies émergentes"
      ]
    },
    {
      category: "Support",
      items: [
        "Assistance 24/7",
        "Formation personnalisée",
        "Documentation complète",
        "Communauté active"
      ]
    },
    {
      category: "ROI",
      items: [
        "Retour sur investissement 400%",
        "Réduction des coûts 60%",
        "Gain de productivité 300%",
        "Automatisation 80% des tâches"
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-black text-center mb-8">
        Avantages de la Plateforme Bot.Bj
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {platformAdvantages.map((advantage, index) => (
          <Card key={index} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-500" />
                {advantage.category}
              </h3>
              <div className="space-y-3">
                {advantage.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-black text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
