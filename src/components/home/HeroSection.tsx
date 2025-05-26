
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onBookingClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onBookingClick }) => {
  return (
    <div className="text-center bg-blue-600 text-white py-16 px-8 rounded-3xl">
      <p className="text-sm lg:text-base text-blue-100 mb-4">
        Pour les entreprises qui fonctionnent déjà bien et qui veulent propulser leur croissance grâce à l'IA →
      </p>
      <h1 className="text-4xl lg:text-6xl font-bold mb-8">
        <span className="text-white">
          Une équipe d'agents IA
        </span>
        <br />
        <span className="text-white">
          qui propulse votre entreprise
        </span>
      </h1>
      <p className="text-lg lg:text-xl text-blue-100 mb-8 max-w-4xl mx-auto">
        Automatisez vos processus, libérez vos équipes des tâches répétitives et 
        concentrez-vous sur l'essentiel. Grâce à nos solutions d'automatisation sur-mesure, 
        chaque agent IA travaille en synergie pour transformer votre quotidien opérationnel.
      </p>
      <Button 
        className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold border-0"
        onClick={onBookingClick}
      >
        Planifiez votre audit offert
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};
