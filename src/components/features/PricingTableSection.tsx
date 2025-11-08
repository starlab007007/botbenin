import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { pricingData } from '@/data/featuresData';
import { useNavigate } from 'react-router-dom';

export const PricingTableSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Plans & Tarifs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choisissez le pack adapté à votre entreprise
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pricingData.map((plan, index) => (
            <Card 
              key={index}
              className={`p-6 space-y-6 relative ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'hover:shadow-lg transition-shadow'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  ⭐ POPULAIRE
                </Badge>
              )}

              {/* Header */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-primary">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
                      <span className="text-muted-foreground">FCFA{plan.period}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.ideal}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button 
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => navigate('/register')}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* Enterprise CTA */}
        <Card className="mt-12 p-8 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold">Besoin d'une solution sur-mesure ?</h3>
            <p className="text-muted-foreground">
              Pour les grandes entreprises et besoins spécifiques
            </p>
            <Button size="lg" variant="outline">
              Contacter les Ventes
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};
