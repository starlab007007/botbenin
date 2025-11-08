import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight } from 'lucide-react';
import { useCasesData } from '@/data/featuresData';

export const UseCasesSection: React.FC = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cas d'Usage par Secteur
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Solutions sur-mesure adaptées à votre secteur d'activité
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCasesData.map((useCase, index) => (
            <Card 
              key={index}
              className="p-6 space-y-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-sm">
                    {useCase.sector}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="font-bold text-primary border-primary"
                  >
                    {useCase.roi}
                  </Badge>
                </div>
              </div>

              {/* Problems */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  Problématiques
                </h4>
                <ul className="space-y-2">
                  {useCase.problems.map((problem, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>{problem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solutions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  Solutions Bot.bj
                </h4>
                <ul className="space-y-2">
                  {useCase.solutions.map((solution, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{solution}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <Button variant="outline" className="w-full gap-2">
                Voir le cas complet
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
