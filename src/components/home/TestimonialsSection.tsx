
import React from 'react';
import { Card } from '@/components/ui/card';
import { Building, Star } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  return (
    <Card className="bg-gray-50 border border-gray-200">
      <div className="p-8">
        <div className="text-center mb-6">
          <Building className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-black mb-2">Témoignages Clients</h3>
          <p className="text-black">Découvrez comment Bot.Bj transforme les entreprises</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <div className="text-2xl font-bold text-green-600 mb-2">+300%</div>
            <div className="text-black text-sm">Productivité équipe marketing</div>
            <div className="text-xs text-gray-500 mt-1">- TechCorp</div>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">-60%</div>
            <div className="text-black text-sm">Coûts opérationnels</div>
            <div className="text-xs text-gray-500 mt-1">- StartupPro</div>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-2">98%</div>
            <div className="text-black text-sm">Satisfaction client</div>
            <div className="text-xs text-gray-500 mt-1">- GroupeInno</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
