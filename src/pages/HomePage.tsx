
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Brain, Users, ArrowRight, Building, Store, GraduationCap, Hotel, Home, ShoppingCart, MessageSquare, CheckCircle, TrendingUp, Award, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Nouvelle conversation',
      description: 'Démarrer un chat avec Bot.Bj',
      icon: Bot,
      color: 'bg-blue-500',
      action: () => navigate('/chat')
    },
    {
      title: 'Créer une automatisation',
      description: 'Nouveau workflow intelligent',
      icon: Zap,
      color: 'bg-purple-500',
      action: () => navigate('/automatisations')
    },
    {
      title: 'Agent Business',
      description: 'CRM et génération de leads',
      icon: Brain,
      color: 'bg-green-500',
      action: () => navigate('/modules/business')
    },
    {
      title: 'Tableau de bord',
      description: 'Analytics et performances',
      icon: TrendingUp,
      color: 'bg-gray-500',
      action: () => navigate('/dashboard')
    }
  ];

  const sectorAdvantages = [
    {
      sector: "PME/PMI",
      icon: Building,
      color: "bg-blue-600",
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
      color: "bg-green-600",
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
      color: "bg-purple-600",
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
      color: "bg-pink-600",
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
      color: "bg-orange-600",
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
      color: "bg-teal-600",
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
      color: "bg-indigo-600",
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
      color: "bg-red-600",
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

  const platformAdvantages = [
    {
      category: "Performance",
      items: [
        "Temps de réponse < 2 secondes",
        "Disponibilité 99.9%",
        "Scalabilité automatique",
        "Infrastructure cloud premium"
      ]
    },
    {
      category: "Innovation",
      items: [
        "IA de dernière génération",
        "Mises à jour continues",
        "R&D permanente",
        "Technologies émergentes"
      ]
    },
    {
      category: "Support",
      items: [
        "Assistance 24/7",
        "Formation personnalisée",
        "Documentation complète",
        "Communauté active"
      ]
    },
    {
      category: "ROI",
      items: [
        "Retour sur investissement 400%",
        "Réduction des coûts 60%",
        "Gain de productivité 300%",
        "Automatisation 80% des tâches"
      ]
    }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-4">
          Actions rapides
        </h1>
        <p className="text-gray-600 text-base lg:text-lg mb-6 lg:mb-8">
          Votre plateforme IA pour automatiser et optimiser vos processus métiers
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickActions.map((action, index) => (
          <Card 
            key={index}
            className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border border-gray-200 rounded-xl"
            onClick={action.action}
          >
            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-base">{action.title}</h3>
            <p className="text-gray-600 text-sm">{action.description}</p>
          </Card>
        ))}
      </div>

      {/* Avantages par Secteur */}
      <div className="space-y-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-8">
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
                  <h3 className="text-xl font-semibold text-gray-900">{sector.sector}</h3>
                </div>
                <div className="space-y-3 mb-4">
                  {sector.advantages.map((advantage, advIndex) => (
                    <div key={advIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{advantage}</span>
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

      {/* Avantages de la Plateforme */}
      <div className="space-y-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-8">
          Avantages de la Plateforme Bot.Bj
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {platformAdvantages.map((advantage, index) => (
            <Card key={index} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-blue-600" />
                  {advantage.category}
                </h3>
                <div className="space-y-3">
                  {advantage.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-900 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Témoignages */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200">
        <div className="p-8">
          <div className="text-center mb-6">
            <Building className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Témoignages Clients</h3>
            <p className="text-gray-600">Découvrez comment Bot.Bj transforme les entreprises</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <div className="text-2xl font-bold text-green-600 mb-2">+300%</div>
              <div className="text-gray-600 text-sm">Productivité équipe marketing</div>
              <div className="text-xs text-gray-500 mt-1">- TechCorp</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-2">-60%</div>
              <div className="text-gray-600 text-sm">Coûts opérationnels</div>
              <div className="text-xs text-gray-500 mt-1">- StartupPro</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-gray-600 text-sm">Satisfaction client</div>
              <div className="text-xs text-gray-500 mt-1">- GroupeInno</div>
            </div>
          </div>
        </div>
      </Card>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 mt-12">
        <div className="p-8 text-center lg:text-left lg:flex lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h3 className="text-2xl font-bold mb-2">Prêt à Transformer votre Business ?</h3>
            <p className="text-blue-100">Découvrez la puissance de l'IA conversationnelle pour votre entreprise</p>
          </div>
          <Button 
            onClick={() => navigate('/chat')}
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4"
          >
            Commencer maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
