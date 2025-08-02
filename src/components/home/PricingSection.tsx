import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Diamond } from 'lucide-react';

export const PricingSection: React.FC = () => {
  const plans = [
    {
      name: "Starter",
      price: "Gratuit",
      period: "",
      description: "Petites entreprises",
      features: [
        { text: "1 Agent IA", included: true },
        { text: "1 000 messages/mois", included: true },
        { text: "Support email", included: true },
        { text: "Intégrations de base", included: true },
        { text: "Tableau de bord analytique", included: true },
        { text: "Suivi des statistiques en temps réel", included: true },
        { text: "QR code de bot", included: true },
        { text: "Partage sur les réseaux sociaux", included: true },
        { text: "Lien webhook", included: true },
        { text: "Relances automatisées", included: false },
        { text: "Scoring des leads", included: false },
        { text: "Envois multicanaux", included: false },
        { text: "Prospection du marché", included: false }
      ],
      buttonText: "Choisir ce plan",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Professional",
      price: "7 500 CFA",
      period: "/mois",
      description: "PME / PMI",
      features: [
        { text: "2 Agents IA", included: true },
        { text: "10 000 messages/mois", included: true },
        { text: "Génération de leads & qualification", included: true },
        { text: "Relances automatisées", included: true },
        { text: "Emails (5 000/mois)", included: true },
        { text: "CRM de suivi des contacts", included: true },
        { text: "Intégrations complètes", included: true },
        { text: "Support prioritaire", included: true },
        { text: "Lien de bot personnalisé", included: true },
        { text: "Prospection automatisée", included: true },
        { text: "Tableau de bord analytique", included: true },
        { text: "Suivi des statistiques en temps réel", included: true },
        { text: "QR code de bot", included: true },
        { text: "Partage sur les réseaux sociaux", included: true },
        { text: "Lien webhook", included: true }
      ],
      buttonText: "Choisir ce plan",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "15 500 CFA",
      period: "/mois",
      description: "Grandes entreprises",
      features: [
        { text: "4 Agents IA", included: true },
        { text: "Messages illimités", included: true },
        { text: "Qualification dynamique IA", included: true },
        { text: "Relances automatiques + manuelles", included: true },
        { text: "Emails/SMS/WhatsApp illimités", included: true },
        { text: "Automatisation marketing IA prédictive", included: true },
        { text: "A/B Testing, scoring évolutif", included: true },
        { text: "Personnalisation avancée", included: true },
        { text: "Support dédié 24/7", included: true },
        { text: "Prospection multicanal avec ciblage IA", included: true },
        { text: "Tableau de bord analytique", included: true },
        { text: "Suivi des statistiques en temps réel", included: true },
        { text: "QR code de bot", included: true },
        { text: "Partage sur les réseaux sociaux", included: true },
        { text: "Lien webhook", included: true }
      ],
      buttonText: "Choisir ce plan",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Custom",
      price: "Sur devis",
      period: "",
      description: "Secteur public & Corporate",
      features: [
        { text: "Solution sur mesure", included: true },
        { text: "Développements spécifiques", included: true },
        { text: "SLA garanti", included: true },
        { text: "Formation et onboarding complet", included: true },
        { text: "Gestion multi-workspace", included: true },
        { text: "Prospection & campagnes à la demande", included: true },
        { text: "Tableau de bord analytique", included: true },
        { text: "Suivi des statistiques en temps réel", included: true },
        { text: "QR code de bot", included: true },
        { text: "Partage sur les réseaux sociaux", included: true },
        { text: "Lien webhook", included: true }
      ],
      buttonText: "Choisir ce plan",
      buttonVariant: "outline" as const,
      popular: false
    }
  ];

  return (
    <section className="w-full py-16 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Structure tarifaire adaptée à tous vos besoins
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.popular 
                  ? 'border-2 border-primary shadow-lg bg-card' 
                  : 'border border-border bg-card hover:shadow-md'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <Badge 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full"
                >
                  Recommandé
                </Badge>
              )}
              
              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-center mb-2">
                  <Diamond className="h-5 w-5 text-primary mr-2" />
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </CardTitle>
                </div>
                
                <div className="mb-2">
                  {plan.name === "Starter" ? (
                    <span className="text-2xl font-bold text-green-600">
                      {plan.price}
                    </span>
                  ) : plan.name === "Custom" ? (
                    <span className="text-2xl font-bold text-orange-600">
                      {plan.price}
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-primary">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {plan.period}
                      </span>
                    </>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-3 px-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-xs ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.buttonVariant}
                  className="w-full mt-6"
                  size="sm"
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};