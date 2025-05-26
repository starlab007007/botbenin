
import React from 'react';
import { Card } from '@/components/ui/card';
import { Bot, MessageCircle, Users, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
  stats: {
    totalBots: number;
    totalMessages: number;
    totalUsers: number;
    activeToday: number;
  };
  maxBots: number;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats, maxBots }) => {
  const quickStats = [
    { 
      title: 'Mes Chatbots', 
      value: stats.totalBots.toString(), 
      limit: maxBots,
      icon: Bot, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      title: 'Messages Total', 
      value: stats.totalMessages.toString(), 
      icon: MessageCircle, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      title: 'Utilisateurs', 
      value: stats.totalUsers.toString(), 
      icon: Users, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      title: 'Actifs Aujourd\'hui', 
      value: stats.activeToday.toString(), 
      icon: TrendingUp, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {quickStats.map((stat, index) => (
        <Card key={index} className="uniform-stats-card">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
          <div className="text-2xl font-bold text-gray-900">
            {stat.value}
            {stat.limit && <span className="text-sm text-gray-500">/{stat.limit}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
};
