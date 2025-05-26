
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  onBookingClick: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onBookingClick }) => {
  return (
    <Card className="bg-blue-600 text-white border-0 mt-12">
      <div className="p-8 text-center lg:text-left lg:flex lg:items-center lg:justify-between">
        <div className="mb-4 lg:mb-0">
          <h3 className="text-2xl font-bold mb-2">Prêt à Transformer votre Business ?</h3>
          <p className="text-blue-100">Découvrez la puissance de l'IA conversationnelle pour votre entreprise</p>
        </div>
        <Button 
          onClick={onBookingClick}
          className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4"
        >
          Commencer maintenant
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </Card>
  );
};
