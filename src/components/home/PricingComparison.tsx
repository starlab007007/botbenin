import React from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

  interface ComparisonFeature {
    category: string;
    features: {
      name: string;
      decouverte: boolean | string;
      starter: boolean | string;
      businessPro: boolean | string;
      marketing: boolean | string;
      serviceClient: boolean | string;
      iaCreateur: boolean | string;
      enterprise: boolean | string;
    }[];
  }

export const PricingComparison: React.FC = () => {
  const comparisonData: ComparisonFeature[] = [
    {
      category: "Bots & Messages",
      features: [
        {
          name: "Nombre de bots IA",
          decouverte: "3 (7j)",
          starter: "3",
          businessPro: "10",
          marketing: "20",
          serviceClient: "Illimité",
          iaCreateur: "-",
          enterprise: "Illimité"
        },
        {
          name: "Messages par mois",
          decouverte: "500 (7j)",
          starter: "1 000",
          businessPro: "5 000",
          marketing: "10 000",
          serviceClient: "20 000",
          iaCreateur: "-",
          enterprise: "Illimité"
        },
        {
          name: "ChatGPT intégré",
          decouverte: "7 jours",
          starter: true,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "Interface chat personnalisable",
          decouverte: "7 jours",
          starter: true,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        }
      ]
    },
    {
      category: "Modules IA",
      features: [
        {
          name: "Module IA Business",
          decouverte: "7 jours",
          starter: "Basique",
          businessPro: "Complet",
          marketing: "Complet",
          serviceClient: "Complet",
          iaCreateur: false,
          enterprise: "Premium"
        },
        {
          name: "Module IA Marketing",
          decouverte: "7 jours",
          starter: false,
          businessPro: "Complet",
          marketing: "Complet",
          serviceClient: "Complet",
          iaCreateur: false,
          enterprise: "Premium"
        },
        {
          name: "Module IA Gestion",
          decouverte: "7 jours",
          starter: false,
          businessPro: "Workflows",
          marketing: "Complet",
          serviceClient: "Complet",
          iaCreateur: false,
          enterprise: "Premium"
        },
        {
          name: "Module IA Citoyen",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: "Complet",
          serviceClient: "Complet",
          iaCreateur: false,
          enterprise: "Premium"
        },
        {
          name: "IA Créateur (Photos)",
          decouverte: "2 photos",
          starter: "Limité",
          businessPro: "Standard",
          marketing: "Avancé",
          serviceClient: "Standard",
          iaCreateur: "ILLIMITÉ ✨",
          enterprise: "Illimité"
        },
        {
          name: "IA Créateur (Flyers)",
          decouverte: "2 flyers",
          starter: "Limité",
          businessPro: "Standard",
          marketing: "Avancé",
          serviceClient: "Standard",
          iaCreateur: "ILLIMITÉ ✨",
          enterprise: "Illimité"
        },
        {
          name: "IA Créateur (Vidéos)",
          decouverte: "2 vidéos",
          starter: "Limité",
          businessPro: "Standard",
          marketing: "Avancé",
          serviceClient: "Standard",
          iaCreateur: "ILLIMITÉ ✨",
          enterprise: "Illimité"
        }
      ]
    },
    {
      category: "Prospects & CRM",
      features: [
        {
          name: "Import de prospects",
          decouverte: "100 (7j)",
          starter: "100/mois",
          businessPro: "Illimité",
          marketing: "Illimité",
          serviceClient: "Illimité",
          iaCreateur: false,
          enterprise: "Illimité"
        },
        {
          name: "Mapping automatique de données",
          decouverte: "7 jours",
          starter: true,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "OCR Documents",
          decouverte: "7 jours",
          starter: false,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "Base de données prospects",
          decouverte: false,
          starter: false,
          businessPro: "Avancée",
          marketing: "Illimitée",
          serviceClient: "Illimitée",
          iaCreateur: false,
          enterprise: "Illimitée"
        },
        {
          name: "Scoring de leads par IA",
          decouverte: "7 jours",
          starter: false,
          businessPro: true,
          marketing: "Avancé",
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "Géolocalisation prospects",
          decouverte: "7 jours",
          starter: false,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        }
      ]
    },
    {
      category: "Campagnes & Automatisation",
      features: [
        {
          name: "Campagnes Email",
          decouverte: "7 jours",
          starter: "500/mois",
          businessPro: "Coordonnées",
          marketing: "Illimité",
          serviceClient: "Illimité",
          iaCreateur: false,
          enterprise: "Illimité"
        },
        {
          name: "Campagnes WhatsApp",
          decouverte: "7 jours",
          starter: "Basique",
          businessPro: "API Premium",
          marketing: "API + Auto",
          serviceClient: "Multilingue",
          iaCreateur: false,
          enterprise: "Premium"
        },
        {
          name: "Campagnes SMS",
          decouverte: "7 jours",
          starter: false,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "Workflows d'automatisation",
          decouverte: false,
          starter: false,
          businessPro: "3",
          marketing: "10",
          serviceClient: "10",
          iaCreateur: false,
          enterprise: "Illimité"
        },
        {
          name: "A/B testing automatique",
          decouverte: "7 jours",
          starter: false,
          businessPro: false,
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "Segmentation d'audience",
          decouverte: "7 jours",
          starter: false,
          businessPro: false,
          marketing: "Intelligente",
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        }
      ]
    },
    {
      category: "Intégrations",
      features: [
        {
          name: "Webhooks personnalisés",
          decouverte: "1",
          starter: "1",
          businessPro: "5",
          marketing: "Illimité",
          serviceClient: "Illimité",
          iaCreateur: false,
          enterprise: "Illimité"
        },
        {
          name: "Google Sheets",
          decouverte: "7 jours",
          starter: false,
          businessPro: "Bidirect.",
          marketing: true,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "Intégrations CRM",
          decouverte: false,
          starter: false,
          businessPro: true,
          marketing: "Avancées",
          serviceClient: "Avancées",
          iaCreateur: false,
          enterprise: "Illimité"
        },
        {
          name: "ElevenLabs (Voix IA)",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: false,
          serviceClient: true,
          iaCreateur: false,
          enterprise: true
        }
      ]
    },
    {
      category: "Analytics & Reporting",
      features: [
        {
          name: "Dashboard analytique",
          decouverte: "Complet (7j)",
          starter: "Détaillé",
          businessPro: "Avancé",
          marketing: "Prédictif",
          serviceClient: "Temps réel",
          iaCreateur: "Création stats",
          enterprise: "Premium"
        },
        {
          name: "Export de données",
          decouverte: false,
          starter: "CSV",
          businessPro: "CSV",
          marketing: "Multi-format",
          serviceClient: "Multi-format",
          iaCreateur: "HD/4K",
          enterprise: "Multi-format"
        },
        {
          name: "Historique conversations",
          decouverte: "7 jours",
          starter: "30 jours",
          businessPro: "Illimité",
          marketing: "Illimité",
          serviceClient: "Illimité",
          iaCreateur: "Médias",
          enterprise: "Illimité"
        },
        {
          name: "Rapports automatisés",
          decouverte: "7 jours",
          starter: false,
          businessPro: true,
          marketing: true,
          serviceClient: true,
          iaCreateur: true,
          enterprise: true
        }
      ]
    },
    {
      category: "Support & Formation",
      features: [
        {
          name: "Support",
          decouverte: "Communauté",
          starter: "Email 48h",
          businessPro: "Email+Tel 24h",
          marketing: "Prioritaire 12h",
          serviceClient: "Dédié+Hotline",
          iaCreateur: "Prioritaire",
          enterprise: "24/7/365"
        },
        {
          name: "Formation personnalisée",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: "2h",
          serviceClient: "4h",
          iaCreateur: "2h création",
          enterprise: "Illimitée"
        },
        {
          name: "Account manager dédié",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: false,
          serviceClient: false,
          iaCreateur: false,
          enterprise: true
        }
      ]
    },
    {
      category: "Fonctionnalités Avancées",
      features: [
        {
          name: "Multi-utilisateurs",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: false,
          serviceClient: false,
          iaCreateur: "1 compte",
          enterprise: "Illimité"
        },
        {
          name: "White-label",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: false,
          serviceClient: false,
          iaCreateur: "Sur créations",
          enterprise: true
        },
        {
          name: "Domaine personnalisé",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: false,
          serviceClient: false,
          iaCreateur: false,
          enterprise: true
        },
        {
          name: "SLA garanti",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: false,
          serviceClient: false,
          iaCreateur: "99%",
          enterprise: "99.9%"
        },
        {
          name: "Stockage médias",
          decouverte: "100 MB",
          starter: "1 GB",
          businessPro: "5 GB",
          marketing: "10 GB",
          serviceClient: "10 GB",
          iaCreateur: "50 GB",
          enterprise: "Illimité"
        },
        {
          name: "Export haute résolution",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: "HD",
          serviceClient: false,
          iaCreateur: "4K",
          enterprise: "4K"
        },
        {
          name: "Templates premium",
          decouverte: false,
          starter: false,
          businessPro: false,
          marketing: "Standard",
          serviceClient: false,
          iaCreateur: "Exclusifs",
          enterprise: "Sur mesure"
        }
      ]
    }
  ];

  const plans = [
    { id: 'decouverte', name: 'Découverte', price: '0 CFA - 7j', color: 'bg-gray-50' },
    { id: 'starter', name: 'Starter', price: '2 500 CFA', color: 'bg-blue-50' },
    { id: 'businessPro', name: 'Business Pro', price: '7 500 CFA', color: 'bg-purple-50', popular: true },
    { id: 'marketing', name: 'Marketing', price: '12 500 CFA', color: 'bg-orange-50' },
    { id: 'serviceClient', name: 'Service Client', price: '15 000 CFA', color: 'bg-green-50' },
    { id: 'iaCreateur', name: 'IA Créateur Pro', price: '25 000 CFA', color: 'bg-gradient-to-br from-pink-50 to-rose-50', popular: true },
    { id: 'enterprise', name: 'Enterprise', price: '25 000 CFA', color: 'bg-gradient-to-br from-yellow-50 to-amber-50' }
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-600 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-gray-300 mx-auto" />
      );
    }
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  };

  return (
    <section className="w-full py-16 bg-gradient-to-br from-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Comparaison Détaillée des Packs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Trouvez le pack qui correspond parfaitement à vos besoins
          </p>
        </div>

        {/* Desktop View - Horizontal Scroll */}
        <div className="hidden lg:block">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-20 bg-card p-4 text-left font-semibold text-foreground min-w-[250px]">
                      Fonctionnalités
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        className={`${plan.color} p-4 text-center min-w-[150px] relative`}
                      >
                        {plan.popular && (
                          <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs">
                            Populaire
                          </Badge>
                        )}
                        <div className="font-bold text-foreground text-sm mt-2">{plan.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{plan.price}/mois</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((category, catIndex) => (
                    <React.Fragment key={catIndex}>
                      <tr className="bg-muted/50">
                        <td colSpan={8} className="p-3 font-semibold text-sm text-foreground">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, featureIndex) => (
                        <tr
                          key={featureIndex}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="sticky left-0 z-10 bg-card p-3 text-sm text-foreground">
                            {feature.name}
                          </td>
                          <td className="p-3 text-center bg-gray-50/50">
                            {renderCell(feature.decouverte)}
                          </td>
                          <td className="p-3 text-center bg-blue-50/50">
                            {renderCell(feature.starter)}
                          </td>
                          <td className="p-3 text-center bg-purple-50/50">
                            {renderCell(feature.businessPro)}
                          </td>
                          <td className="p-3 text-center bg-orange-50/50">
                            {renderCell(feature.marketing)}
                          </td>
                          <td className="p-3 text-center bg-green-50/50">
                            {renderCell(feature.serviceClient)}
                          </td>
                          <td className="p-3 text-center bg-gradient-to-br from-pink-50/50 to-rose-50/50">
                            {renderCell(feature.iaCreateur)}
                          </td>
                          <td className="p-3 text-center bg-gradient-to-br from-yellow-50/50 to-amber-50/50">
                            {renderCell(feature.enterprise)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Mobile View - Cards */}
        <div className="lg:hidden space-y-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`${plan.color} p-6`}>
              <div className="text-center mb-6">
                {plan.popular && (
                  <Badge className="mb-2">Populaire</Badge>
                )}
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.price}/mois</p>
              </div>
              
              {comparisonData.map((category, catIndex) => (
                <div key={catIndex} className="mb-6">
                  <h4 className="font-semibold text-sm text-foreground mb-3 border-b border-border pb-2">
                    {category.category}
                  </h4>
                  <div className="space-y-3">
                    {category.features.map((feature, featureIndex) => {
                      const value = feature[plan.id as keyof typeof feature];
                      return (
                        <div key={featureIndex} className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{feature.name}</span>
                          <div className="flex items-center">
                            {renderCell(value as boolean | string)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
