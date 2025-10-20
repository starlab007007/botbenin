import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MessageCircle, PhoneCall, CreditCard } from 'lucide-react';

import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { MTNMomoPaymentModal } from '@/components/payments/MTNMomoPaymentModal';
import { MoovMoneyPaymentModal } from '@/components/payments/MoovMoneyPaymentModal';
import { SBINPaymentModal } from '@/components/payments/SBINPaymentModal';

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
        name: "Pack Découverte - Essai 7 Jours",
        priceCFA: 0,
        description: 'Toutes les fonctionnalités gratuites pendant 7 jours',
        features: [
          "✨ ACCÈS COMPLET 7 JOURS",
          "3 bots IA personnalisés",
          "500 messages/mois",
          "Tous les modules IA (Business, Marketing, Gestion)",
          "IA Créateur : 2 photos, 2 flyers, 2 vidéos",
          "Gestion prospects (100 contacts)",
          "Campagnes WhatsApp basiques",
          "Analytics en temps réel",
          "Intégration WhatsApp Business",
          "Dashboard analytique complet",
          "Support communautaire",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'starter',
        name: 'Pack Starter',
        priceCFA: 2500,
        description: 'Idéal pour les petites entreprises',
        features: [
          "3 bots IA personnalisés",
          "1 000 messages/mois",
          "Module IA Business (accès basique)",
          "Import prospects intelligent (100 contacts/mois)",
          "Mapping automatique de données CSV/Excel",
          "Campagnes email (500 envois/mois)",
          "Intégration WhatsApp Business basique",
          "Analytics détaillés + export CSV",
          "Historique conversations (30 jours)",
          "1 webhook personnalisé",
          "Support email (48h)",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'business-pro',
        name: 'Pack Business Pro 🚀',
        priceCFA: 7500,
        description: 'Solution complète pour PME ambitieuses',
        features: [
          "10 bots IA avec personnalisation avancée",
          "5 000 messages/mois",
          "Module IA Business complet (Prospection B2B, Scoring leads)",
          "Module IA Marketing (Campagnes multicanales)",
          "Module IA Gestion (Workflows automatisés)",
          "Import prospects illimité + OCR documents",
          "Base de données prospects avec géolocalisation",
          "Campagnes Email/WhatsApp/SMS coordonnées",
          "3 workflows d'automatisation personnalisés",
          "Scoring de leads par IA",
          "Intégration Google Sheets bidirectionnelle",
          "WhatsApp Business API Premium",
          "Analytics avancés + rapports automatisés",
          "Historique illimité + backup mensuel",
          "5 webhooks personnalisés",
          "Support email + téléphone (24h)",
          ...allCommonFeatures,
        ],
        popular: true,
      },
      {
        id: 'marketing-automation',
        name: 'Pack Marketing Automation 🎯',
        priceCFA: 12500,
        description: 'Pour marketeurs et créateurs de contenu',
        features: [
          "20 bots IA spécialisés marketing",
          "10 000 messages/mois",
          "Tous les modules IA (Business, Marketing, Gestion, Citoyen)",
          "Module Visual Creator avec génération IA d'images",
          "Module Visual Creator avec génération IA de vidéos",
          "Génération automatique de textes marketing par IA",
          "Campagnes multicanales automatisées illimitées",
          "10 workflows d'automatisation marketing",
          "Segmentation d'audience intelligente",
          "A/B testing automatique de campagnes",
          "Gestion prospects illimitée + scoring avancé",
          "Email marketing illimité",
          "WhatsApp Business API + automatisations",
          "Analytics prédictifs + reporting en temps réel",
          "Intégrations CRM avancées",
          "Webhooks illimités",
          "Formation personnalisée (2h)",
          "Support prioritaire email/téléphone (12h)",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'service-client',
        name: 'Pack Service Client Premium 💬',
        priceCFA: 15000,
        description: 'Support client automatisé 24/7',
        features: [
          "Bots IA illimités pour support",
          "20 000 messages/mois",
          "Chatbot multilingue (FR, EN + langues locales)",
          "Intégration ElevenLabs pour voix IA réaliste",
          "Module Citoyen pour services publics",
          "Gestion conversations temps réel + file d'attente",
          "Routage intelligent vers agents humains",
          "Base de connaissances IA auto-apprenante",
          "Historique complet illimité des conversations",
          "Analyse de sentiment client par IA",
          "Rapports de satisfaction automatisés",
          "Automatisation confirmations et rappels",
          "Système de tickets intégré",
          "Dashboard de performance temps réel",
          "API webhooks personnalisés illimités",
          "Intégrations CRM + helpdesk",
          "Formation équipe support (4h)",
          "Support dédié + hotline prioritaire",
          ...allCommonFeatures,
        ],
      },
      {
        id: 'ia-createur',
        name: 'IA Créateur Pro 🎨',
        priceCFA: 25000,
        description: 'Spécialisé dans la création de contenu IA',
        features: [
          "🎨 CRÉATION ILLIMITÉE",
          "Photos IA haute qualité : ILLIMITÉ",
          "Flyers professionnels : ILLIMITÉ",
          "Vidéographies IA : ILLIMITÉ",
          "Tous les styles & formats disponibles",
          "Export haute résolution (4K)",
          "Templates premium exclusifs",
          "Bibliothèque de médias enrichie",
          "Branding et personnalisation avancée",
          "Stockage cloud 50 GB",
          "Analytics de création",
          "White-label sur créations",
          "SLA 99% uptime",
          "Support création prioritaire",
          "Formation création de contenu (2h)",
          ...allCommonFeatures,
        ],
        popular: true,
      },
      {
        id: 'enterprise',
        name: 'Pack Enterprise 👑',
        priceCFA: 25000,
        description: 'Solution sur mesure pour grandes entreprises',
        features: [
          "Bots IA illimités tous types",
          "Messages illimités",
          "Tous les modules IA en version Premium",
          "Visual Creator Pro (images + vidéos illimitées)",
          "Workflows d'automatisation illimités",
          "Éditeur visuel de workflows no-code",
          "Templates métiers sur mesure",
          "Automatisation complète (RH, ventes, support, marketing)",
          "IA générative avancée (GPT-4 + modèles personnalisés)",
          "Multi-utilisateurs illimités + rôles granulaires",
          "White-label complet (votre marque)",
          "Domaine personnalisé + branding",
          "Intégrations API illimitées",
          "Hébergement dédié sécurisé",
          "Backup quotidien automatique",
          "SLA 99.9% avec compensation",
          "Account manager dédié",
          "Formation sur mesure illimitée",
          "Développement de fonctionnalités personnalisées",
          "Support premium 24/7/365",
          ...allCommonFeatures,
        ],
      },
    ],
    []
  );

  const [paymentPlan, setPaymentPlan] = useState<null | { name: string; amount: number }>(null);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'MTN' | 'MOOV' | 'SBIN' | null>(null);

  const handleWhatsApp = (plan: Plan) => {
    const price = plan.priceCFA === 0 ? 'Gratuit' : `${plan.priceCFA.toLocaleString()} CFA/mois`;
    const text = encodeURIComponent(
      `Bonjour, je souhaite souscrire au ${plan.name} (${price}).\n\nFonctionnalités clés:\n- ${plan.features.slice(0, 6).join('\n- ')}\n\nMerci de me recontacter.`
    );
    // Ouvre WhatsApp avec le numéro Bénin dédié
    window.open(`https://wa.me/22947333289?text=${text}`, '_blank');
  };

  const handleSubscribe = (plan: Plan) => {
    setPaymentPlan({ name: plan.name, amount: plan.priceCFA });
    setShowMethodSelector(true);
  };

  const handleMethodSelect = (method: 'MTN' | 'MOOV' | 'SBIN') => {
    setSelectedMethod(method);
    setShowMethodSelector(false);
  };

  const closePaymentModal = () => {
    setSelectedMethod(null);
    setPaymentPlan(null);
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
                    onClick={() => handleSubscribe(plan)}
                    disabled={plan.priceCFA === 0}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> S'abonner
                  </Button>
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => handleWhatsApp(plan)}>
                    <PhoneCall className="mr-2 h-4 w-4" /> WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <a href="https://bot.bj/bot/770c2547-db60-41ab-9f18-1f080fa7ebbb" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> Discuter
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <PaymentMethodSelector
        open={showMethodSelector}
        onOpenChange={setShowMethodSelector}
        onSelectMethod={handleMethodSelect}
        amountCFA={paymentPlan?.amount || 0}
        planName={paymentPlan?.name}
      />

      <MTNMomoPaymentModal
        open={selectedMethod === 'MTN' && paymentPlan !== null}
        onOpenChange={(open) => !open && closePaymentModal()}
        amountCFA={paymentPlan?.amount || 0}
        planName={paymentPlan?.name}
      />

      <MoovMoneyPaymentModal
        open={selectedMethod === 'MOOV' && paymentPlan !== null}
        onOpenChange={(open) => !open && closePaymentModal()}
        amountCFA={paymentPlan?.amount || 0}
        planName={paymentPlan?.name}
      />

      <SBINPaymentModal
        open={selectedMethod === 'SBIN' && paymentPlan !== null}
        onOpenChange={(open) => !open && closePaymentModal()}
        amountCFA={paymentPlan?.amount || 0}
        planName={paymentPlan?.name}
      />
    </section>
  );
};
