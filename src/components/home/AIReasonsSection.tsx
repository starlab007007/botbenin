
import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, UserCheck, Edit3, Users, Target, Clock4 } from 'lucide-react';

export const AIReasonsSection: React.FC = () => {
  const aiReasons = [
    {
      title: "Vos processus manuels freinent votre croissance",
      description: "Vous passez trop de temps sur des tâches répétitives qui ne demandent pas votre expertise, au lieu de vous concentrer sur l'innovation.",
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      title: "Vos équipes sont constamment débordées",
      description: "La charge opérationnelle empêche vos collaborateurs de se consacrer aux missions à forte valeur ajoutée et freine votre développement.",
      icon: UserCheck,
      color: "bg-blue-500"
    },
    {
      title: "La productivité est votre priorité",
      description: "Vous souhaitez optimiser chaque minute de votre journée pour réorienter vos ressources vers des projets stratégiques et créatifs.",
      icon: Edit3,
      color: "bg-blue-500"
    },
    {
      title: "Le recrutement, c'est une galère",
      description: "Trouver les bons profils pour soulager votre opérationnel représente un investissement en temps et en argent. Nos solutions remplacent cette complexité en automatisant les tâches chronophages.",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Vous visez l'excellence opérationnelle",
      description: "Pour rester en tête, vous devez moderniser vos processus et intégrer une technologie de pointe qui vous donne un avantage durable.",
      icon: Target,
      color: "bg-blue-500"
    },
    {
      title: "Pas le temps de vous informer et d'apprendre sur l'IA",
      description: "Vous savez que l'IA peut transformer votre business, mais vous n'avez pas le temps de devenir expert. Laissez-nous vous apporter les résultats, rapidement et efficacement.",
      icon: Clock4,
      color: "bg-blue-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8">L'IA est faite pour vous si :</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiReasons.map((reason, index) => (
          <Card key={index} className="bg-white border-gray-200 text-black p-6 hover:shadow-lg transition-shadow">
            <div className={`w-12 h-12 ${reason.color} rounded-xl flex items-center justify-center mb-4`}>
              <reason.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-black">{reason.title}</h3>
            <p className="text-black text-sm leading-relaxed">{reason.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
