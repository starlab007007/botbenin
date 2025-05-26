
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Brain, Users, ArrowRight, Building, Store, GraduationCap, Hotel, Home, ShoppingCart, MessageSquare, CheckCircle, TrendingUp, Award, Star, Target, Settings, Rocket, Clock, RefreshCw, Edit3, UserCheck, Gauge, Clock4, Search, FileText, Video, HelpCircle, Book, Mail, Phone, Presentation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuditBookingModal } from '@/components/AuditBookingModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showBookingModal, setShowBookingModal] = useState(false);

  const quickStats = [
    { label: 'Entreprises automatisées', value: '500+', icon: Building },
    { label: 'Workflows actifs', value: '2500+', icon: Zap },
    { label: 'Temps de réponse moyen', value: '< 2sec', icon: Clock },
    { label: 'Satisfaction client', value: '98%', icon: HelpCircle }
  ];

  const quickActions = [
    {
      title: 'Documentation',
      description: 'Guides complets et tutoriels détaillés pour maîtriser toutes les fonctionnalités de Bot.Bj',
      icon: Book,
      color: 'bg-blue-500',
      action: () => navigate('/support'),
      features: ['Guides étape par étape', 'Configuration complète', 'Exemples pratiques', 'Mises à jour régulières']
    },
    {
      title: 'Chat en direct',
      description: 'Support instantané 24/7 avec nos experts techniques et consultants business',
      icon: MessageSquare,
      color: 'bg-green-500',
      action: () => navigate('/chat'),
      features: ['Support 24/7', 'Experts spécialisés', 'Résolution rapide', 'Plusieurs langues']
    },
    {
      title: 'Vidéos tutoriels',
      description: 'Apprenez visuellement avec nos guides vidéo complets et interactifs',
      icon: Video,
      color: 'bg-purple-500',
      action: () => navigate('/support'),
      features: ['Tutoriels HD', 'Tous niveaux', 'Mise à jour continue', 'Téléchargement offline']
    },
    {
      title: 'Agent Business',
      description: 'CRM et génération de leads automatisés pour votre entreprise',
      icon: Brain,
      color: 'bg-orange-500',
      action: () => navigate('/modules/business'),
      features: ['CRM intelligent', 'Lead scoring', 'Analyses prédictives', 'Rapports automatiques']
    },
    {
      title: 'Présentation de la plateforme',
      description: "Découvrez l'unicité de Bot.Bj, ses spécialités et sa valeur ajoutée",
      icon: Presentation,
      color: 'bg-gradient-to-r from-pink-500 to-purple-600',
      action: () => navigate('/support'),
      features: ['Vision complète', 'Avantages uniques', 'Démonstrations', 'Témoignages clients']
    },
    {
      title: 'Nouvelle automatisation',
      description: 'Créez des workflows intelligents pour optimiser vos processus métier',
      icon: Zap,
      color: 'bg-blue-600',
      action: () => navigate('/automatisations'),
      features: ['Workflows sur mesure', 'Intégrations API', 'Déclencheurs multiples', 'Logique conditionnelle']
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
      color: "bg-green-500"
    },
    {
      title: "Félicitations, vos automatisations sont prêtes",
      description: "En quelques jours, vos automatisations IA sont déployées et opérationnelles, accompagnées d'une documentation claire et d'un suivi continu pour garantir performance et évolutivité.",
      icon: Rocket,
      color: "bg-purple-500"
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
      price: "À partir de 300.000 CFA",
      buttonText: "Réserver un rdv",
      color: "bg-green-500"
    },
    {
      title: "Solution sur-mesure",
      description: "Chaque projet est unique. Nos tarifs s'adaptent à la complexité de vos besoins pour vous offrir le meilleur rapport qualité-prix.",
      price: "Sur devis",
      buttonText: "Réserver un rdv",
      color: "bg-purple-500"
    }
  ];

  const faqs = [
    {
      question: 'Comment créer une automatisation ?',
      answer: 'Rendez-vous dans la section Automatisations et cliquez sur "Nouvelle automatisation". Suivez notre guide étape par étape pour configurer votre premier workflow.',
      category: 'Workflows'
    },
    {
      question: 'Comment intégrer mes outils existants ?',
      answer: "Via les workflows vous pouvez connecter plus de 400 services et API. Utilisez nos connecteurs prêts à l'emploi ou créez vos propres intégrations.",
      category: 'Intégrations'
    },
    {
      question: 'Quels sont les tarifs ?',
      answer: 'Nous proposons un audit gratuit pour évaluer vos besoins, puis des forfaits à partir de 300.000 CFA selon la complexité de vos automatisations.',
      category: 'Tarifs'
    },
    {
      question: 'Comment gérer les utilisateurs ?',
      answer: 'Accédez aux paramètres de compte pour inviter des utilisateurs et gérer les permissions. Définissez des rôles spécifiques selon vos besoins.',
      category: 'Utilisateurs'
    },
    {
      question: "Quels sont les différents types d'agents IA ?",
      answer: "Bot.Bj propose 4 types d'agents : Business (analyse de données), Marketing (campagnes automatisées), Gestion (processus RH) et Citoyen (services publics).",
      category: 'Agents IA'
    },
    {
      question: 'Comment optimiser les performances ?',
      answer: 'Surveillez les métriques de performance dans votre tableau de bord, optimisez vos workflows et utilisez notre cache intelligent pour des réponses ultra-rapides.',
      category: 'Performance'
    }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold text-black mb-2">Bot.Bj - Plateforme d'Automatisation IA</h1>
        <p className="text-lg text-black">Toute la puissance de l'IA pour automatiser et optimiser vos processus métiers</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-white border border-gray-200 p-4 text-center rounded-xl">
            <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-black">{stat.value}</div>
            <div className="text-sm text-black">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center space-x-4">
          <Search className="w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="Que souhaitez-vous automatiser ? (ex: processus RH, gestion clients, marketing...)"
            className="flex-1 text-black placeholder-gray-500 focus:outline-none text-lg border-none bg-transparent"
          />
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2">
            Rechercher
          </Button>
        </div>
      </Card>

      {/* Main Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {quickActions.map((action, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border border-gray-200 rounded-xl group">
            <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow`}>
              <action.icon className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">{action.title}</h2>
            <p className="text-black mb-4">{action.description}</p>
            
            <div className="space-y-2 mb-4">
              {action.features.map((feature, idx) => (
                <div key={idx} className="flex items-center text-sm text-black">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  {feature}
                </div>
              ))}
            </div>
            
            <Button 
              onClick={action.action}
              className={`${action.color} hover:opacity-90 text-white w-full group-hover:shadow-md transition-all`}
            >
              Découvrir
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ))}
      </div>

      {/* Comment ça marche Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-black mb-4">Comment ça marche ?</h2>
          <p className="text-lg text-black">Une approche simple et efficace pour transformer vos processus</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {processSteps.map((step, index) => (
            <Card key={index} className="bg-white border border-gray-200 text-black p-8 hover:shadow-xl transition-shadow rounded-xl">
              <div className={`w-16 h-16 ${step.color} rounded-xl flex items-center justify-center mb-6 mx-auto`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">{step.title}</h3>
              <p className="text-black leading-relaxed text-center">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-2xl font-semibold text-black mb-6">Questions Fréquentes</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-black pr-2">{faq.question}</h3>
                <span className="px-3 py-1 bg-gray-100 text-black text-xs rounded-full font-medium whitespace-nowrap">
                  {faq.category}
                </span>
              </div>
              <p className="text-black leading-relaxed">{faq.answer}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0"
              >
                En savoir plus →
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Tarifs Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-black mb-8">Nos Offres</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className="bg-white border border-gray-200 text-black p-8 hover:shadow-xl transition-shadow rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-center">{plan.title}</h3>
              <p className="text-black text-sm mb-6 text-center leading-relaxed">{plan.description}</p>
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-black mb-2">{plan.price}</div>
              </div>
              <Button 
                className={`w-full ${plan.color} hover:opacity-90 text-white border-0 font-semibold py-3`}
                onClick={() => setShowBookingModal(true)}
              >
                {plan.buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <Card className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 rounded-xl">
        <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h2 className="text-2xl font-bold mb-2">Besoin d'aide personnalisée ?</h2>
            <p className="text-blue-100">Notre équipe d'experts est disponible 24/7 pour vous accompagner</p>
            <div className="mt-4 text-sm text-blue-100">
              <div>• Support technique spécialisé</div>
              <div>• Consultation stratégique</div>
              <div>• Formation personnalisée</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => navigate('/chat')}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat en direct
            </Button>
            <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm">
              <Mail className="w-4 h-4 mr-2" />
              support@bot.bj
            </Button>
            <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm">
              <Phone className="w-4 h-4 mr-2" />
              +229 01 40 29 91 91
            </Button>
          </div>
        </div>
      </Card>

      {/* Success Stories */}
      <Card className="p-8 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-2xl font-semibold text-black mb-6 text-center">Témoignages Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold text-black mb-2">+300% Efficacité</h3>
            <p className="text-black text-sm">Automatisation des processus métier</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-semibold text-black mb-2">Temps de réponse &lt; 2sec</h3>
            <p className="text-black text-sm">Réactivité optimale des automatisations</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="font-semibold text-black mb-2">ROI de 400%</h3>
            <p className="text-black text-sm">Retour sur investissement moyen</p>
          </div>
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
