import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Rocket, DollarSign, Globe, MapPin, Smartphone, 
  Zap, Brain, TrendingUp 
} from 'lucide-react';
import { benefitsData } from '@/data/featuresData';

const iconMap: Record<string, React.ElementType> = {
  rocket: Rocket,
  'dollar-sign': DollarSign,
  globe: Globe,
  'map-pin': MapPin,
  smartphone: Smartphone,
  zap: Zap,
  brain: Brain,
  'trending-up': TrendingUp
};

export const BenefitsSection: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Avantages Compétitifs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ce qui fait de Bot.bj la meilleure solution d'automatisation en Afrique
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefitsData.map((benefit, index) => {
            const Icon = iconMap[benefit.icon];
            return (
              <Card 
                key={index}
                className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
