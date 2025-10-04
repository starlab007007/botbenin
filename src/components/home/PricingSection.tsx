import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MessageCircle, PhoneCall, CreditCard } from 'lucide-react';

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
        name: "Pack Découverte",
        priceCFA: 0,
        description: 'Testez gratuitement la plateforme',
        features: [
          "1 bot IA avec ChatGPT intégré",
          "Jusqu'à 100 messages/mois",
          "Interface chat personnalisable",
          "Lien de partage public",
          "QR code de bot",
          "Tableau de bord analytique basique",
          "Support communautaire",
        ],
      },
      {
        id: 'starter',
        name: 'Pack Starter',
        priceCFA: 5000,
        description: 'Pour démarrer efficacement',
        features: [
          "3 bots IA personnalisés",
          "1 000 messages/mois",
          "Import intelligent de prospects (100 contacts)",
          "Mapping automatique de données",
          "Module IA Business accès basique",
          "Campagnes email (jusqu'à 500 emails/mois)",
          "Analytics et rapports détaillés",
          "Intégration WhatsApp Business",
          "Support email prioritaire",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'business-pro',
        name: 'Pack Business Pro 🚀',
        priceCFA: 15000,
        description: 'Solution complète pour PME',
        features: [
          "10 bots IA illimités",
          "5 000 messages/mois",
          "Import prospects illimité + OCR documents",
          "Base de données prospects avancée",
          "Module IA Business complet",
          "Module IA Marketing complet",
          "Module IA Gestion avec workflows",
          "3 workflows d'automatisation",
          "Campagnes multicanales (Email/WhatsApp/SMS)",
          "Intégration CRM et Google Sheets",
          "Chatbot service client",
          "Analytics avancés avec tracking visiteurs",
          "Liens raccourcis personnalisés",
          "Support téléphonique + email",
          ...allCommonFeatures,
        ],
        popular: true,
      },
      {
        id: 'marketing-automation',
        name: 'Pack Marketing Automation 🎯',
        priceCFA: 25000,
        description: 'Spécialisé marketing digital',
        features: [
          "15 bots IA spécialisés marketing",
          "10 000 messages/mois",
          "Tous les modules IA (Business, Marketing, Gestion, Citoyen)",
          "Campagnes sociales IA avec génération de contenu",
          "Publications automatiques multi-plateformes",
          "10 workflows d'automatisation marketing",
          "Segmentation audience avancée",
          "A/B testing automatique",
          "Génération de contenu par IA (images et textes)",
          "Gestion prospects illimitée avec scoring",
          "Email marketing illimité",
          "WhatsApp Business API Premium",
          "Analytics prédictifs et reporting automatisé",
          "Intégrations avancées (CRM, Analytics, etc.)",
          "Formation personnalisée 2h",
          "Support prioritaire 24/7",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'service-client',
        name: 'Pack Service Client Premium 💬',
        priceCFA: 30000,
        description: 'Support client automatisé',
        features: [
          "Bots IA illimités pour support client",
          "20 000 messages/mois",
          "Chatbot multilingue intelligent",
          "Intégration ElevenLabs pour voix IA",
          "Gestion conversations en temps réel",
          "Routage intelligent des demandes",
          "Base de connaissances IA",
          "Historique complet des conversations",
          "Analyse sentiment client",
          "Rapports satisfaction automatisés",
          "Automatisation confirmations et rappels",
          "Intégration tickets de support",
          "Dashboard de performance temps réel",
          "API webhooks personnalisés",
          "Formation équipe support 4h",
          "Support dédié + hotline",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'enterprise',
        name: 'Pack Enterprise 👑',
        priceCFA: 50000,
        description: 'Solution sur mesure',
        features: [
          "Bots IA illimités tous modules",
          "Messages illimités",
          "Tous les modules IA Premium",
          "Workflows d'automatisation illimités",
          "Éditeur visuel de workflows drag & drop",
          "Templates métiers personnalisés",
          "Automatisation RH, ventes, support complète",
          "IA générative avancée (GPT-5 + Gemini)",
          "Multi-utilisateurs avec permissions granulaires",
          "White-label et personnalisation complète",
          "Intégrations API illimitées",
          "Hébergement dédié et sécurisé",
          "Backup quotidien automatique",
          "SLA 99.9% garanti",
          "Account manager dédié",
          "Formation sur mesure illimitée",
          "Développement fonctionnalités personnalisées",
          "Support premium 24/7/365",
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
    window.open(`https://wa.me/22947333289?text=${text}`, '_blank');
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
                    <a href="https://bot.bj/bot/0484686a-34c8-4eeb-8974-90b079ee9fe2" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> Discuter
                    </a>
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
