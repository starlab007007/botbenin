import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Brain, Users, ArrowRight, Building, Store, GraduationCap, Hotel, Home, ShoppingCart, MessageSquare, CheckCircle, TrendingUp, Award, Star, Target, Settings, Rocket, Clock, RefreshCw, Edit3, UserCheck, Gauge, Clock4 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuditBookingModal } from '@/components/AuditBookingModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showBookingModal, setShowBookingModal] = useState(false);

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
      color: 'bg-blue-500',
      action: () => navigate('/automatisations')
    },
    {
      title: 'Agent Business',
      description: 'CRM et génération de leads',
      icon: Brain,
      color: 'bg-blue-500',
      action: () => navigate('/modules/business')
    },
    {
      title: 'Tableau de bord',
      description: 'Analytics et performances',
      icon: TrendingUp,
      color: 'bg-blue-500',
      action: () => navigate('/dashboard')
    }
  ];

  const processSteps = [
    {
      title: "Nous auditons vos besoins",
      description: "Nous analysons en profondeur vos processus pour identifier les gisements de productivité. Vous obtenez une vision claire des opportunités d'automatisation qui vous feront gagner un temps précieux.",
      icon: Target,
      color: "bg-blue-500"
    },
    {
      title: "Développement des automatisations",
      description: "Nous concevons et intégrons des workflows intelligents, parfaitement adaptés à votre environnement. Vos outils actuels restent inchangés, tandis que nos solutions s'y imbriquent pour transformer vos tâches répétitives en leviers stratégiques.",
      icon: Settings,
      color: "bg-blue-500"
    },
    {
      title: "Félicitations, vos automatisations sont prêtes",
      description: "En quelques jours, vos automatisations IA sont déployées et opérationnelles, accompagnées d'une documentation claire et d'un suivi continu pour garantir performance et évolutivité.",
      icon: Rocket,
      color: "bg-blue-500"
    }
  ];

  const aiReasons = [
    {
      title: "Vos processus manuels freinent votre croissance",
      description: "Vous passez trop de temps sur des tâches répétitives qui ne demandent pas votre expertise, au lieu de vous concentrer sur l'innovation.",
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      title: "Vos équipes sont constamment débordées",
      description: "La charge opérationnelle empêche vos collaborateurs de se consacrer aux missions à forte valeur ajoutée et freine votre développement.",
      icon: UserCheck,
      color: "bg-blue-500"
    },
    {
      title: "La productivité est votre priorité",
      description: "Vous souhaitez optimiser chaque minute de votre journée pour réorienter vos ressources vers des projets stratégiques et créatifs.",
      icon: Edit3,
      color: "bg-blue-500"
    },
    {
      title: "Le recrutement, c'est une galère",
      description: "Trouver les bons profils pour soulager votre opérationnel représente un investissement en temps et en argent. Nos solutions remplacent cette complexité en automatisant les tâches chronophages.",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Vous visez l'excellence opérationnelle",
      description: "Pour rester en tête, vous devez moderniser vos processus et intégrer une technologie de pointe qui vous donne un avantage durable.",
      icon: Target,
      color: "bg-blue-500"
    },
    {
      title: "Pas le temps de vous informer et d'apprendre sur l'IA",
      description: "Vous savez que l'IA peut transformer votre business, mais vous n'avez pas le temps de devenir expert. Laissez-nous vous apporter les résultats, rapidement et efficacement.",
      icon: Clock4,
      color: "bg-blue-500"
    }
  ];

  const aiAdvantages = [
    {
      title: "Disponibles 24h/7",
      features: [
        "Les agents IA ne prennent jamais de pause",
        "Support continu jour et nuit",
        "Garantie d'une exploitation ininterrompue de votre entreprise"
      ],
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      title: "Intégration fluide avec vos outils existants",
      features: [
        "Connexion directe à votre environnement digital",
        "Aucune interruption de vos processus actuels",
        "Complément idéal à votre écosystème technologique"
      ],
      icon: RefreshCw,
      color: "bg-blue-500"
    },
    {
      title: "Conçus pour une fiabilité sur le long terme",
      features: [
        "S'adaptent aux évolutions de vos besoins business",
        "Conçus pour une fiabilité sur le long terme"
      ],
      icon: Gauge,
      color: "bg-blue-500"
    }
  ];

  const pricingPlans = [
    {
      title: "Audit offert",
      description: "Découvrez gratuitement, en seulement 30 minutes, combien de temps et de ressources vous pouvez économiser grâce à l'IA.",
      price: "Gratuit",
      buttonText: "Réserver mon audit",
      color: "bg-blue-500"
    },
    {
      title: "Premier test",
      description: "Lancez votre première automatisation et constatez par vous-même l'impact sur votre efficacité opérationnelle.",
      price: "Premier test gratuit",
      buttonText: "Réserver un rdv",
      color: "bg-blue-500"
    },
    {
      title: "Solution sur-mesure",
      description: "Chaque projet est unique. Nos tarifs s'adaptent à la complexité de vos besoins pour vous offrir le meilleur rapport qualité-prix.",
      price: "Sur devis",
      buttonText: "Réserver un rdv",
      color: "bg-blue-500"
    }
  ];

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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-white min-h-screen">
      {/* Hero Section */}
      <Card className="bg-blue-600 text-white py-16 px-8 rounded-3xl border border-gray-300">
        <div className="text-center">
          <Card className="inline-block bg-blue-500 text-blue-100 mb-4 px-4 py-2 rounded-lg border border-gray-400">
            <p className="text-sm lg:text-base">
              Pour les entreprises qui fonctionnent déjà bien et qui veulent propulser leur croissance grâce à l'IA →
            </p>
          </Card>
          <Card className="bg-transparent border-none">
            <h1 className="text-4xl lg:text-6xl font-bold mb-8 text-white">
              <span className="text-white">
                Une équipe d'agents IA
              </span>
              <br />
              <span className="text-white">
                qui propulse votre entreprise
              </span>
            </h1>
          </Card>
          <Card className="bg-transparent border-none mb-8">
            <p className="text-lg lg:text-xl text-blue-100 max-w-4xl mx-auto">
              Automatisez vos processus, libérez vos équipes des tâches répétitives et 
              concentrez-vous sur l'essentiel. Grâce à nos solutions d'automatisation sur-mesure, 
              chaque agent IA travaille en synergie pour transformer votre quotidien opérationnel.
            </p>
          </Card>
          <Button 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold border-2 border-gray-300"
            onClick={() => setShowBookingModal(true)}
          >
            Planifiez votre audit offert
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>

      {/* Comment ça marche Section */}
      <Card className="space-y-8 p-8 border border-gray-300">
        <div className="text-center">
          <Card className="inline-block p-4 border border-gray-300 bg-white">
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">Comment ça marche ?</h2>
            <p className="text-lg text-black">Une approche simple et efficace pour transformer vos processus</p>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {processSteps.map((step, index) => (
            <Card key={index} className="bg-white border-gray-300 text-black p-8 hover:shadow-xl transition-shadow">
              <div className={`w-16 h-16 ${step.color} rounded-xl flex items-center justify-center mb-6 mx-auto border border-gray-400`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <Card className="border border-gray-300 p-4 mb-4">
                <h3 className="text-xl font-semibold text-center text-black">{step.title}</h3>
              </Card>
              <Card className="border border-gray-300 p-4">
                <p className="text-black leading-relaxed text-center">{step.description}</p>
              </Card>
            </Card>
          ))}
        </div>
      </Card>

      {/* L'IA est faite pour vous si Section */}
      <Card className="space-y-8 p-8 border border-gray-300">
        <div className="text-center">
          <Card className="inline-block p-4 border border-gray-300 bg-white">
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8">L'IA est faite pour vous si :</h2>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiReasons.map((reason, index) => (
            <Card key={index} className="bg-white border-gray-300 text-black p-6 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${reason.color} rounded-xl flex items-center justify-center mb-4 border border-gray-400`}>
                <reason.icon className="w-6 h-6 text-white" />
              </div>
              <Card className="border border-gray-300 p-3 mb-3">
                <h3 className="text-lg font-semibold text-black">{reason.title}</h3>
              </Card>
              <Card className="border border-gray-300 p-3">
                <p className="text-black text-sm leading-relaxed">{reason.description}</p>
              </Card>
            </Card>
          ))}
        </div>
      </Card>

      {/* Les avantages de nos assistants IA */}
      <Card className="space-y-8 p-8 border border-gray-300">
        <div className="text-center">
          <Card className="inline-block p-4 border border-gray-300 bg-white">
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8">Les avantages de nos assistants IA</h2>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {aiAdvantages.map((advantage, index) => (
            <Card key={index} className="bg-white border-gray-300 text-black p-8 hover:shadow-xl transition-shadow">
              <div className={`w-16 h-16 ${advantage.color} rounded-xl flex items-center justify-center mb-6 mx-auto border border-gray-400`}>
                <advantage.icon className="w-8 h-8 text-white" />
              </div>
              <Card className="border border-gray-300 p-4 mb-6">
                <h3 className="text-xl font-semibold text-center text-black">{advantage.title}</h3>
              </Card>
              <ul className="space-y-3">
                {advantage.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <Card className="p-2 border border-gray-300 flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-black text-sm">{feature}</span>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Card>

      {/* Combien ça coûte Section */}
      <Card className="space-y-8 p-8 border border-gray-300">
        <div className="text-center">
          <Card className="inline-block p-4 border border-gray-300 bg-white">
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8">Combien ça coûte ?</h2>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className="bg-white border-gray-300 text-black p-8 hover:shadow-xl transition-shadow">
              <Card className="border border-gray-300 p-4 mb-4">
                <h3 className="text-xl font-semibold text-center text-black">{plan.title}</h3>
              </Card>
              <Card className="border border-gray-300 p-4 mb-6">
                <p className="text-black text-sm text-center leading-relaxed">{plan.description}</p>
              </Card>
              <Card className="border border-gray-300 p-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-black">{plan.price}</div>
                </div>
              </Card>
              <Button 
                className={`w-full ${plan.color} hover:bg-blue-600 text-white border-2 border-gray-300 font-semibold py-3`}
                onClick={() => setShowBookingModal(true)}
              >
                {plan.buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* Header */}
      <Card className="p-8 border border-gray-300">
        <div className="text-center lg:text-left">
          <Card className="inline-block p-4 border border-gray-300 mb-4">
            <h1 className="text-2xl lg:text-4xl font-bold text-black">
              Actions rapides
            </h1>
          </Card>
          <Card className="border border-gray-300 p-4">
            <p className="text-black text-base lg:text-lg">
              Votre plateforme IA pour automatiser et optimiser vos processus métiers
            </p>
          </Card>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-8 border border-gray-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border-gray-300 rounded-xl"
              onClick={action.action}
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-sm border border-gray-400`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <Card className="border border-gray-300 p-2 mb-2">
                <h3 className="font-semibold text-black text-base">{action.title}</h3>
              </Card>
              <Card className="border border-gray-300 p-2">
                <p className="text-black text-sm">{action.description}</p>
              </Card>
            </Card>
          ))}
        </div>
      </Card>

      {/* Avantages par Secteur */}
      <Card className="space-y-8 p-8 border border-gray-300">
        <Card className="text-center p-4 border border-gray-300">
          <h2 className="text-2xl lg:text-3xl font-bold text-black mb-8">
            Avantages par Secteur d'Activité
          </h2>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sectorAdvantages.map((sector, index) => (
            <Card key={index} className="bg-white border-gray-300 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${sector.color} rounded-xl flex items-center justify-center mr-4 border border-gray-400`}>
                    <sector.icon className="w-6 h-6 text-white" />
                  </div>
                  <Card className="border border-gray-300 p-2 flex-1">
                    <h3 className="text-xl font-semibold text-black">{sector.sector}</h3>
                  </Card>
                </div>
                <Card className="border border-gray-300 p-4 mb-4">
                  <div className="space-y-3">
                    {sector.advantages.map((advantage, advIndex) => (
                      <div key={advIndex} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-black text-sm">{advantage}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className={`${sector.color} text-white rounded-lg p-3 text-center border border-gray-400`}>
                  <div className="font-bold">ROI Moyen: {sector.roi}</div>
                </Card>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Avantages de la Plateforme */}
      <Card className="space-y-8 p-8 border border-gray-300">
        <Card className="text-center p-4 border border-gray-300">
          <h2 className="text-2xl lg:text-3xl font-bold text-black mb-8">
            Avantages de la Plateforme Bot.Bj
          </h2>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {platformAdvantages.map((advantage, index) => (
            <Card key={index} className="bg-white border-gray-300 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <Card className="border border-gray-300 p-3 mb-4">
                  <h3 className="text-lg font-semibold text-black flex items-center">
                    <Award className="w-5 h-5 mr-2 text-blue-500" />
                    {advantage.category}
                  </h3>
                </Card>
                <div className="space-y-3">
                  {advantage.items.map((item, itemIndex) => (
                    <Card key={itemIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-black text-sm">{item}</span>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Témoignages */}
      <Card className="bg-gray-50 border-gray-300">
        <div className="p-8">
          <div className="text-center mb-6">
            <Building className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <Card className="inline-block p-4 border border-gray-300 mb-2">
              <h3 className="text-2xl font-bold text-black">Témoignages Clients</h3>
            </Card>
            <Card className="border border-gray-300 p-2">
              <p className="text-black">Découvrez comment Bot.Bj transforme les entreprises</p>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center p-4 border border-gray-300">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-blue-500 fill-current" />
                ))}
              </div>
              <div className="text-2xl font-bold text-green-600 mb-2">+300%</div>
              <div className="text-black text-sm">Productivité équipe marketing</div>
              <div className="text-xs text-gray-500 mt-1">- TechCorp</div>
            </Card>
            <Card className="text-center p-4 border border-gray-300">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-blue-500 fill-current" />
                ))}
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-2">-60%</div>
              <div className="text-black text-sm">Coûts opérationnels</div>
              <div className="text-xs text-gray-500 mt-1">- StartupPro</div>
            </Card>
            <Card className="text-center p-4 border border-gray-300">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-blue-500 fill-current" />
                ))}
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-black text-sm">Satisfaction client</div>
              <div className="text-xs text-gray-500 mt-1">- GroupeInno</div>
            </Card>
          </div>
        </div>
      </Card>

      {/* CTA Section */}
      <Card className="bg-blue-600 text-white border-gray-300 mt-12">
        <div className="p-8 text-center lg:text-left lg:flex lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <Card className="inline-block p-3 bg-blue-500 border border-gray-400 mb-2">
              <h3 className="text-2xl font-bold text-white">Prêt à Transformer votre Business ?</h3>
            </Card>
            <Card className="p-2 bg-blue-500 border border-gray-400">
              <p className="text-blue-100">Découvrez la puissance de l'IA conversationnelle pour votre entreprise</p>
            </Card>
          </div>
          <Button 
            onClick={() => setShowBookingModal(true)}
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 border-2 border-gray-300"
          >
            Commencer maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>

      {/* Modal de réservation */}
      <AuditBookingModal 
        open={showBookingModal} 
        onOpenChange={setShowBookingModal} 
      />
    </div>
  );
};
