
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  MessageCircle, 
  Users, 
  TrendingUp,
  Eye
} from 'lucide-react';
import { DashboardStats, UserPermissions } from './DashboardStats';

interface QuickStatsCardsProps {
  stats: DashboardStats;
  permissions: UserPermissions;
  onShowAllData?: () => void;
}

export const QuickStatsCards: React.FC<QuickStatsCardsProps> = ({ 
  stats, 
  permissions, 
  onShowAllData 
}) => {
  const quickStats = [
    { 
      title: 'Mes Chatbots', 
      value: stats.totalBots.toString(), 
      limit: permissions.maxBots,
      icon: Bot, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      title: 'Messages Total', 
      value: stats.totalMessages.toString(), 
      icon: MessageCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      title: 'Utilisateurs', 
      value: stats.totalUsers.toString(), 
      icon: Users, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      title: 'Actifs Aujourd\'hui', 
      value: stats.activeToday.toString(), 
      icon: TrendingUp, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="uniform-stats-card">
            <div className="flex flex-col items-center justify-center mb-2 sm:mb-3">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mb-2 sm:mb-3`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm mb-1 text-center">{stat.title}</h3>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
              {stat.value}
              {stat.limit && <span className="text-xs sm:text-sm text-gray-500">/{stat.limit}</span>}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Bouton pour voir toutes les données */}
      {onShowAllData && (
        <div className="flex justify-center px-2 sm:px-0">
          <Button onClick={onShowAllData} variant="outline" className="w-full sm:max-w-md">
            <Eye className="w-4 h-4 mr-2" />
            <span className="text-sm sm:text-base">Voir toutes les données</span>
          </Button>
        </div>
      )}
    </div>
  );
};
