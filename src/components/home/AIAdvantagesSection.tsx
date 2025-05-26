
import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, RefreshCw, Gauge } from 'lucide-react';

export const AIAdvantagesSection: React.FC = () => {
  const aiAdvantages = [
    {
      title: "Disponibles 24h/7",
      features: [
        "Les agents IA ne prennent jamais de pause",
        "Support continu jour et nuit",
        "Garantie d'une exploitation ininterrompue de votre entreprise"
      ],
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      title: "Intégration fluide avec vos outils existants",
      features: [
        "Connexion directe à votre environnement digital",
        "Aucune interruption de vos processus actuels",
        "Complément idéal à votre écosystème technologique"
      ],
      icon: RefreshCw,
      color: "bg-blue-500"
    },
    {
      title: "Conçus pour une fiabilité sur le long terme",
      features: [
        "S'adaptent aux évolutions de vos besoins business",
        "Conçus pour une fiabilité sur le long terme"
      ],
      icon: Gauge,
      color: "bg-blue-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8">Les avantages de nos assistants IA</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {aiAdvantages.map((advantage, index) => (
          <Card key={index} className="bg-white border-gray-200 text-black p-8 hover:shadow-xl transition-shadow">
            <div className={`w-16 h-16 ${advantage.color} rounded-xl flex items-center justify-center mb-6 mx-auto`}>
              <advantage.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-6 text-center text-black">{advantage.title}</h3>
            <ul className="space-y-3">
              {advantage.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-black text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};
