import React from 'react';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { ModuleFeature } from '@/types/module';

interface ModuleFeaturesGridProps {
  features: ModuleFeature[];
}

export const ModuleFeaturesGrid: React.FC<ModuleFeaturesGridProps> = ({ features }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">✨ Fonctionnalités Clés</h3>
        <p className="text-muted-foreground">
          Découvrez les capacités puissantes qui font la différence
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{feature.name}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
              
              <div className="pl-11 space-y-3">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                    💎 Avantage
                  </div>
                  <div className="text-sm text-green-900 dark:text-green-300">
                    {feature.advantage}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Comment l'utiliser :
                  </div>
                  <ol className="space-y-1.5">
                    {feature.howToUse.map((step, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary font-medium">{idx + 1}.</span>
                        <span className="text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
