
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase,
  Megaphone,
  Zap,
  ArrowRight,
  TrendingUp,
  Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const AIModules: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    prospectsCount: 0,
    campaignsCount: 0,
    automationsCount: 0
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Compter les prospects
      const { count: prospectsCount } = await supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Compter les campagnes
      const { count: campaignsCount } = await supabase
        .from('social_sharing_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user?.id);

      // Compter les automatisations
      const { count: automationsCount } = await supabase
        .from('automations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setStats({
        prospectsCount: prospectsCount || 0,
        campaignsCount: campaignsCount || 0,
        automationsCount: automationsCount || 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const aiModules = [
    {
      title: 'IA Business',
      description: 'Solutions B2B et prospection automatisée',
      icon: Briefcase,
      path: '/modules/business',
      stats: stats.prospectsCount > 0 ? `${stats.prospectsCount} prospects` : 'Commencer',
      badge: 'Populaire'
    },
    {
      title: 'IA Marketing',
      description: 'Campagnes et génération de leads',
      icon: Megaphone,
      path: '/modules/marketing',
      stats: stats.campaignsCount > 0 ? `${stats.campaignsCount} campagnes` : 'Commencer',
      badge: 'Nouveau'
    },
    {
      title: 'Campagnes Sociales',
      description: 'Partage personnalisé multi-plateformes',
      icon: Share2,
      path: '/social-campaigns',
      stats: stats.campaignsCount > 0 ? `${stats.campaignsCount} actives` : 'Nouvelle fonctionnalité',
      badge: 'New'
    },
    {
      title: 'Automatisations',
      description: 'Workflows et processus automatisés',
      icon: Zap,
      path: '/automations',
      stats: stats.automationsCount > 0 ? `${stats.automationsCount} workflows` : 'Commencer',
      badge: 'Pro'
    }
  ];
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
