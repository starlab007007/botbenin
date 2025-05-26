
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface PricingSectionProps {
  onBookingClick: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onBookingClick }) => {
  const pricingPlans = [
    {
      title: "Audit offert",
      description: "Découvrez gratuitement, en seulement 30 minutes, combien de temps et de ressources vous pouvez économiser grâce à l'IA.",
      price: "Gratuit",
      buttonText: "Réserver mon audit",
      color: "bg-blue-500"
    },
    {
      title: "Premier test",
      description: "Lancez votre première automatisation et constatez par vous-même l'impact sur votre efficacité opérationnelle.",
      price: "À partir de 300.000 CFA",
      buttonText: "Réserver un rdv",
      color: "bg-blue-500"
    },
    {
      title: "Solution sur-mesure",
      description: "Chaque projet est unique. Nos tarifs s'adaptent à la complexité de vos besoins pour vous offrir le meilleur rapport qualité-prix.",
      price: "Sur devis",
      buttonText: "Réserver un rdv",
      color: "bg-blue-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8">Combien ça coûte ?</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {pricingPlans.map((plan, index) => (
          <Card key={index} className="bg-white border-gray-200 text-black p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold mb-4 text-center text-black">{plan.title}</h3>
            <p className="text-black text-sm mb-6 text-center leading-relaxed">{plan.description}</p>
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-black mb-2">{plan.price}</div>
            </div>
            <Button 
              className={`w-full ${plan.color} hover:bg-blue-600 text-white border-0 font-semibold py-3`}
              onClick={onBookingClick}
            >
              {plan.buttonText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
