
import React from 'react';
import { Card } from '@/components/ui/card';
import { Target, Settings, Rocket } from 'lucide-react';

export const ProcessSection: React.FC = () => {
  const processSteps = [
    {
      title: "Nous auditons vos besoins",
      description: "Nous analysons en profondeur vos processus pour identifier les gisements de productivité. Vous obtenez une vision claire des opportunités d'automatisation qui vous feront gagner un temps précieux.",
      icon: Target,
      color: "bg-blue-500"
    },
    {
      title: "Développement des automatisations",
      description: "Nous concevons et intégrons des workflows intelligents, parfaitement adaptés à votre environnement. Vos outils actuels restent inchangés, tandis que nos solutions s'y imbriquent pour transformer vos tâches répétitives en leviers stratégiques.",
      icon: Settings,
      color: "bg-blue-500"
    },
    {
      title: "Félicitations, vos automatisations sont prêtes",
      description: "En quelques jours, vos automatisations IA sont déployées et opérationnelles, accompagnées d'une documentation claire et d'un suivi continu pour garantir performance et évolutivité.",
      icon: Rocket,
      color: "bg-blue-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">Comment ça marche ?</h2>
        <p className="text-lg text-black">Une approche simple et efficace pour transformer vos processus</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {processSteps.map((step, index) => (
          <Card key={index} className="bg-white border-gray-200 text-black p-8 hover:shadow-xl transition-shadow">
            <div className={`w-16 h-16 ${step.color} rounded-xl flex items-center justify-center mb-6 mx-auto`}>
              <step.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-center text-black">{step.title}</h3>
            <p className="text-black leading-relaxed text-center">{step.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
