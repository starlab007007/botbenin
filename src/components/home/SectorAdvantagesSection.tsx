
import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, Building, Store, Users, MessageSquare, GraduationCap, Hotel, Home, ShoppingCart } from 'lucide-react';

export const SectorAdvantagesSection: React.FC = () => {
  const sectorAdvantages = [
    {
      sector: "PME/PMI",
      icon: Building,
      color: "bg-blue-500",
      advantages: [
        "Automatisation des processus RH et comptables",
        "Gestion intelligente des stocks et commandes",
        "Support client 24/7 automatisé",
        "Analyse prédictive des ventes",
        "Réduction des coûts opérationnels de 40%"
      ],
      roi: "300% en 6 mois"
    },
    {
      sector: "Commerçants",
      icon: Store,
      color: "bg-blue-500",
      advantages: [
        "Chatbot pour conseils produits personnalisés",
        "Gestion automatique des inventaires",
        "Programme de fidélité intelligent",
        "Notifications push ciblées",
        "Analyse comportementale clients"
      ],
      roi: "250% en 4 mois"
    },
    {
      sector: "Citoyens/Administration",
      icon: Users,
      color: "bg-blue-500",
      advantages: [
        "Démarches administratives simplifiées",
        "Assistance 24/7 pour services publics",
        "Suivi automatique des dossiers",
        "Notifications importantes automatiques",
        "Interface multilingue adaptée"
      ],
      roi: "Satisfaction +85%"
    },
    {
      sector: "Agences de Communication",
      icon: MessageSquare,
      color: "bg-blue-500",
      advantages: [
        "Création automatique de contenus",
        "Gestion multi-clients centralisée",
        "Campagnes publicitaires optimisées par IA",
        "Reporting automatique et analytics",
        "Gestion des réseaux sociaux 24/7"
      ],
      roi: "400% en 3 mois"
    },
    {
      sector: "Organismes de Formation",
      icon: GraduationCap,
      color: "bg-blue-500",
      advantages: [
        "Assistant pédagogique intelligent",
        "Suivi personnalisé des apprenants",
        "Évaluation automatisée",
        "Planification optimisée des cours",
        "Support technique multilingue"
      ],
      roi: "200% en 5 mois"
    },
    {
      sector: "Hôtellerie",
      icon: Hotel,
      color: "bg-blue-500",
      advantages: [
        "Réservations et check-in automatisés",
        "Conciergerie virtuelle 24/7",
        "Gestion des réclamations instantanée",
        "Recommandations personnalisées",
        "Optimisation des tarifs dynamique"
      ],
      roi: "350% en 4 mois"
    },
    {
      sector: "Immobilier",
      icon: Home,
      color: "bg-blue-500",
      advantages: [
        "Qualification automatique des prospects",
        "Visites virtuelles intelligentes",
        "Estimation automatique des biens",
        "Suivi du processus de vente",
        "Marketing ciblé par IA"
      ],
      roi: "280% en 6 mois"
    },
    {
      sector: "E-commerce",
      icon: ShoppingCart,
      color: "bg-blue-500",
      advantages: [
        "Recommandations produits personnalisées",
        "Assistance shopping intelligente",
        "Gestion automatique des retours",
        "Optimisation des prix en temps réel",
        "Analytics comportementaux avancés"
      ],
      roi: "450% en 3 mois"
    }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-black text-center mb-8">
        Avantages par Secteur d'Activité
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sectorAdvantages.map((sector, index) => (
          <Card key={index} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${sector.color} rounded-xl flex items-center justify-center mr-4`}>
                  <sector.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-black">{sector.sector}</h3>
              </div>
              <div className="space-y-3 mb-4">
                {sector.advantages.map((advantage, advIndex) => (
                  <div key={advIndex} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-black text-sm">{advantage}</span>
                  </div>
                ))}
              </div>
              <div className={`${sector.color} text-white rounded-lg p-3 text-center`}>
                <div className="font-bold">ROI Moyen: {sector.roi}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
