
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase,
  Megaphone,
  Zap,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

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

export const AIModules: React.FC = () => {
  return (
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
  );
};
