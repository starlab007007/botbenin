import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MessageCircle, PhoneCall, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MTNMomoPaymentModal } from '@/components/payments/MTNMomoPaymentModal';

interface Plan {
  id: string;
  name: string;
  priceCFA: number; // monthly price in CFA (0 for free)
  period?: string;
  description?: string;
  features: string[];
  popular?: boolean;
}

const allCommonFeatures = [
  'Lien de bot personnalisé',
  'Tableau de bord analytique',
  'Suivi des statistiques en temps réel',
  'QR code de bot',
  'Partage sur les réseaux sociaux',
  'Lien webhook',
];

export const PricingSection: React.FC = () => {
  const plans: Plan[] = useMemo(
    () => [
      {
        id: 'decouverte',
        name: "Pack Découverte (Service basique)",
        priceCFA: 0,
        description: 'Idéal pour commencer',
        features: [
          "Analyse de 3 tâches répétitives maximum",
          "1 scénario d'automatisation simple (jusqu'à 2 applications)",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'essentiel',
        name: 'Pack Essentiel',
        priceCFA: 3000,
        description: 'Parfait pour les petites équipes',
        features: [
          "Analyse de 5 tâches répétitives maximum",
          "2 scénarios d'automatisation (jusqu'à 3 applications)",
          "Jusqu'à 10 actions par scénario",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'pro',
        name: 'Pack Professionnel 🚀',
        priceCFA: 5000,
        description: 'Croissance et efficacité',
        features: [
          "Analyse de 10 tâches répétitives maximum",
          "3 scénarios d'automatisation (jusqu'à 4 applications)",
          "Jusqu'à 20 actions par scénario",
          "Support email et appel téléphonique",
          'Intégration basique avec ChatGPT (création de texte simple)',
          ...allCommonFeatures,
        ],
        popular: true,
      },
      {
        id: 'marketing',
        name: 'Pack Automatisation Marketing 🎯',
        priceCFA: 7500,
        description: 'Spécialisation Marketing',
        features: [
          'Automatisation des publications sur les réseaux sociaux (avec intégration de ChatGPT pour la création de contenu)',
          'Campagnes emailing automatisées',
          'Gestion automatique des prospects',
          'Tracking des performances des campagnes et reporting automatisé',
          'Livrables: Scénarios d\'automatisation, documentation et suivi des résultats',
          ...allCommonFeatures,
        ],
      },
      {
        id: 'support',
        name: 'Pack Automatisation du Service Client 💬',
        priceCFA: 10000,
        description: 'Spécialisation Service Client',
        features: [
          'Mise en place d’un chatbot pour la gestion des demandes client',
          "Automatisation de l'envoi de confirmation, de suivi et de rappels",
          'Création de rapports sur les performances du service client',
          'Support et documentation détaillés',
          'Livrables: Scénarios complets et accès aux données de performance',
          ...allCommonFeatures,
        ],
      },
      {
        id: 'ventes',
        name: 'Pack Automatisation des Ventes 🤝',
        priceCFA: 15000,
        description: 'Spécialisation Ventes',
        features: [
          'Automatisation des tâches liées au suivi de prospects',
          'Mise en place d’un système de qualification lead automatique',
          'Intégration de votre CRM',
          'Rapports de performance des leads et des ventes',
          'Livrables: Scénarios optimisés, formation et suivi des résultats',
          ...allCommonFeatures,
        ],
      },
    ],
    []
  );

  const [paymentPlan, setPaymentPlan] = useState<null | { name: string; amount: number }>(null);

  const handleWhatsApp = (plan: Plan) => {
    const price = plan.priceCFA === 0 ? 'Gratuit' : `${plan.priceCFA.toLocaleString()} CFA/mois`;
    const text = encodeURIComponent(
      `Bonjour, je souhaite souscrire au ${plan.name} (${price}).\n\nFonctionnalités clés:\n- ${plan.features.slice(0, 6).join('\n- ')}\n\nMerci de me recontacter.`
    );
    // Ouvre WhatsApp avec le numéro Bénin dédié
    window.open(`https://wa.me/2290140299191?text=${text}`, '_blank');
  };

  return (
    <section className="w-full py-16 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Nos Packs et Abonnements
          </h2>
          <p className="text-muted-foreground">Choisissez le pack qui correspond à vos besoins</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? 'border-2 border-primary shadow-lg bg-card' : 'border border-border bg-card hover:shadow-md'} transition-all duration-300`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full">
                  Recommandé
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">{plan.name}</CardTitle>
                <div className="mt-2">
                  {plan.priceCFA === 0 ? (
                    <span className="text-2xl font-bold text-green-600">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-primary">{plan.priceCFA.toLocaleString()} CFA</span>
                      <span className="text-muted-foreground text-sm"> / mois</span>
                    </>
                  )}
                </div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4 px-4 pb-6">
                <ul className="space-y-2">
                  {plan.features.map((text, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setPaymentPlan({ name: plan.name, amount: plan.priceCFA })}
                    disabled={plan.priceCFA === 0}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> S'abonner
                  </Button>
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => handleWhatsApp(plan)}>
                    <PhoneCall className="mr-2 h-4 w-4" /> WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link to="/chat/0484686a-34c8-4eeb-8974-90b079ee9fe2">
                      <MessageCircle className="mr-2 h-4 w-4" /> Discuter
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <MTNMomoPaymentModal
        open={!!paymentPlan}
        onOpenChange={(v) => !v && setPaymentPlan(null)}
        amountCFA={paymentPlan?.amount || 0}
        planName={paymentPlan?.name || ''}
      />
    </section>
  );
};
