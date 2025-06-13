
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  BarChart3, 
  Target,
  ArrowRight,
  Star
} from 'lucide-react';

const quickActions = [
  {
    title: 'Créer un Bot',
    description: 'Configurez un nouveau bot automatisé',
    icon: Bot,
    path: '/bots',
    color: 'from-blue-500 to-blue-600',
    featured: true
  },
  {
    title: 'Dashboard',
    description: 'Consultez vos statistiques',
    icon: BarChart3,
    path: '/dashboard',
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

export const QuickActions: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Actions rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
  );
};
