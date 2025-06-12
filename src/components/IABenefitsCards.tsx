
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings, 
  RotateCcw, 
  TrendingUp, 
  Users, 
  Target, 
  Bot
} from 'lucide-react';

const iaBenefits = [
  {
    title: 'Vos processus manuels freinent votre croissance',
    description: 'Vous passez trop de temps sur des tâches répétitives qui ne demandent pas votre expertise, au lieu de vous concentrer sur l\'innovation.',
    icon: Settings,
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Vos équipes sont constamment débordées',
    description: 'La charge opérationnelle empêche vos collaborateurs de se consacrer aux missions à forte valeur ajoutée et freine votre développement.',
    icon: RotateCcw,
    color: 'from-green-500 to-green-600'
  },
  {
    title: 'La productivité est votre priorité',
    description: 'Vous souhaitez optimiser chaque minute de votre journée pour réorienter vos ressources vers des projets stratégiques et créatifs.',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Le recrutement, c\'est une galère',
    description: 'Trouver les bons profils pour soulager votre opérationnel représente un investissement en temps et en argent. Nos solutions remplacent cette complexité en automatisant les tâches chronophages.',
    icon: Users,
    color: 'from-orange-500 to-orange-600'
  },
  {
    title: 'Vous visez l\'excellence opérationnelle',
    description: 'Pour rester en tête, vous devez moderniser vos processus et intégrer une technologie de pointe qui vous donne un avantage durable.',
    icon: Target,
    color: 'from-pink-500 to-pink-600'
  },
  {
    title: 'Pas le temps de vous informer et d\'apprendre sur l\'IA',
    description: 'Vous savez que l\'IA peut transformer votre business, mais vous n\'avez pas le temps de devenir expert. Laissez-nous vous apporter les résultats, rapidement et efficacement.',
    icon: Bot,
    color: 'from-indigo-500 to-indigo-600'
  }
];

export const IABenefitsCards: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          L'IA est faite pour vous si :
        </h2>
        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
          Découvrez comment notre intelligence artificielle peut transformer votre entreprise
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {iaBenefits.map((benefit, index) => (
          <Card 
            key={index}
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white border-0 overflow-hidden relative"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
            <CardHeader className="pb-4 relative">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                {benefit.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <CardDescription className="text-gray-600 leading-relaxed">
                {benefit.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
