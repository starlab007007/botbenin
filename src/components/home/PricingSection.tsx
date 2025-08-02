import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export const PricingSection: React.FC = () => {
  const plans = [
    {
      name: "Starter",
      price: "29€",
      period: "/mois",
      description: "Parfait pour débuter avec l'IA",
      features: [
        "1 bot IA inclus",
        "1000 messages/mois",
        "Support par email",
        "Intégration de base",
        "Tableau de bord simple"
      ],
      buttonText: "Commencer",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Professional",
      price: "79€",
      period: "/mois",
      description: "Pour les entreprises en croissance",
      features: [
        "5 bots IA inclus",
        "10 000 messages/mois",
        "Support prioritaire",
        "Intégrations avancées",
        "Analytics détaillées",
        "API accès",
        "Personnalisation avancée"
      ],
      buttonText: "Choisir Pro",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "Sur mesure",
      period: "",
      description: "Solution complète pour grandes entreprises",
      features: [
        "Bots IA illimités",
        "Messages illimités",
        "Support dédié 24/7",
        "Intégrations sur mesure",
        "Formation équipe",
        "SLA garanti",
        "Sécurité renforcée"
      ],
      buttonText: "Nous contacter",
      buttonVariant: "outline" as const,
      popular: false
    }
  ];

  return (
    <section className="w-full py-16 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Choisissez votre plan
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Des solutions adaptées à chaque étape de votre transformation digitale
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105 bg-card/80 backdrop-blur-sm' 
                  : 'bg-card/50 backdrop-blur-sm hover:bg-card/80'
              } transition-all duration-300 hover:shadow-lg`}
            >
              {plan.popular && (
                <Badge 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground"
                >
                  Plus populaire
                </Badge>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-xl font-semibold text-foreground">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <CardDescription className="mt-2 text-muted-foreground">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.buttonVariant}
                  className="w-full mt-6"
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Tous les plans incluent une période d'essai gratuite de 14 jours
          </p>
        </div>
      </div>
    </section>
  );
};