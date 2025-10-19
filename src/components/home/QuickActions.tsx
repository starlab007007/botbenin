
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Bot, 
  BarChart3, 
  Target,
  ArrowRight,
  Star,
  Briefcase,
  Sparkles
} from 'lucide-react';

const quickActions = [
  {
    title: 'WhatsApp',
    description: 'Automatisez vos conversations WhatsApp',
    icon: MessageCircle,
    path: '/modules/business',
    color: 'from-green-500 to-green-600',
    featured: true
  },
  {
    title: 'IA Prospects',
    description: 'Import et gestion intelligente de prospects',
    icon: Target,
    path: '/modules/business',
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'IA Business',
    description: 'Solutions B2B et automatisation',
    icon: Briefcase,
    path: '/modules/business',
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'IA Créateur',
    description: 'Générez du contenu avec l\'IA',
    icon: Sparkles,
    path: '/bots',
    color: 'from-pink-500 to-pink-600'
  },
  {
    title: 'Dashboard',
    description: 'Consultez vos statistiques',
    icon: BarChart3,
    path: '/dashboard',
    color: 'from-orange-500 to-orange-600'
  },
  {
    title: 'Créer un Bot',
    description: 'Configurez un nouveau bot IA',
    icon: Bot,
    path: '/bots',
    color: 'from-indigo-500 to-indigo-600'
  }
];

export const QuickActions: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 px-2 sm:px-0">Actions rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {quickActions.map((action) => (
          <Card 
            key={action.path} 
            className={`group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-gradient-to-br ${action.color} text-white relative overflow-hidden ${
              action.featured ? 'sm:col-span-2 lg:col-span-2' : ''
            }`}
          >
            <Link to={action.path} className="block h-full">
              <CardHeader className="pb-2 px-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <action.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white/90" />
                  {action.featured && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Recommandé
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-white text-base sm:text-lg mt-2">
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <CardDescription className="text-white/80 mb-3 sm:mb-4 text-xs sm:text-sm">
                  {action.description}
                </CardDescription>
                <div className="flex items-center text-white/90 text-xs sm:text-sm">
                  Commencer
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 sm:-translate-y-12 sm:translate-x-12 lg:-translate-y-16 lg:translate-x-16"></div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};
