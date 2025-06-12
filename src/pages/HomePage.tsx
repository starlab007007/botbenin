
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Bot, 
  BarChart3, 
  Zap,
  Briefcase,
  Megaphone,
  Target,
  ArrowRight,
  TrendingUp,
  Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';

const quickActions = [
  {
    title: 'Chat IA',
    description: 'Discutez avec notre assistant intelligent',
    icon: MessageCircle,
    path: '/app/chat',
    color: 'from-green-500 to-green-600',
    featured: true
  },
  {
    title: 'Créer un Bot',
    description: 'Configurez un nouveau bot automatisé',
    icon: Bot,
    path: '/app/bots',
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Dashboard',
    description: 'Consultez vos statistiques',
    icon: BarChart3,
    path: '/app/dashboard',
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Prospects',
    description: 'Gérez votre pipeline commercial',
    icon: Target,
    path: '/prospects',
    color: 'from-pink-500 to-pink-600'
  }
];

const aiModules = [
  {
    title: 'IA Business',
    description: 'Solutions B2B et prospection automatisée',
    icon: Briefcase,
    path: '/app/modules/business',
    stats: '156 prospects générés',
    badge: 'Populaire'
  },
  {
    title: 'IA Marketing',
    description: 'Campagnes et génération de leads',
    icon: Megaphone,
    path: '/app/modules/marketing',
    stats: '23 campagnes actives',
    badge: 'Nouveau'
  },
  {
    title: 'Automatisations',
    description: 'Workflows et processus automatisés',
    icon: Zap,
    path: '/app/automations',
    stats: '12 automatisations',
    badge: 'Pro'
  }
];

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header de bienvenue - responsive */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl lg:rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {getGreeting()}, {user?.name || 'Utilisateur'} ! 👋
            </h1>
            <p className="text-blue-100 text-base sm:text-lg">
              Prêt à optimiser votre productivité avec l'IA ?
            </p>
          </div>
          <div className="flex items-center space-x-6 lg:space-x-4">
            <div className="text-center lg:text-right">
              <div className="text-xl sm:text-2xl font-bold">24</div>
              <div className="text-xs sm:text-sm text-blue-200">Bots actifs</div>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-xl sm:text-2xl font-bold">156</div>
              <div className="text-xs sm:text-sm text-blue-200">Prospects</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides - responsive grid */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickActions.map((action) => (
            <Card 
              key={action.path} 
              className={`group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-gradient-to-br ${action.color} text-white relative overflow-hidden ${
                action.featured ? 'sm:col-span-2' : ''
              }`}
            >
              <Link to={action.path} className="block h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <action.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white/90" />
                    {action.featured && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Recommandé
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-base sm:text-lg">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-white/80 mb-4 text-sm">
                    {action.description}
                  </CardDescription>
                  <div className="flex items-center text-white/90 text-sm">
                    Commencer
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Modules IA */}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Modules IA spécialisés</h2>
          <div className="space-y-4">
            {aiModules.map((module) => (
              <Card key={module.path} className="group hover:shadow-md transition-all duration-200">
                <Link to={module.path}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                          <module.icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 transition-colors">
                            {module.title}
                            {module.badge && (
                              <Badge variant="secondary" className="ml-2 text-xs px-2 py-0.5">
                                {module.badge}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">{module.description}</CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 mr-2 flex-shrink-0" />
                      {module.stats}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Nouvelle section avec les avantages IA */}
        <div>
          <IABenefitsCards />
        </div>
      </div>
    </div>
  );
};
