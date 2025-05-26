
import React from 'react';
import { Card } from '@/components/ui/card';
import { Bot, Zap, BarChart3, TrendingUp, Settings } from 'lucide-react';

interface UserPermissions {
  canCreateBots: boolean;
  canCreateAutomations: boolean;
  canAccessBusiness: boolean;
  canAccessMarketing: boolean;
  canAccessManagement: boolean;
}

interface PermissionsCardProps {
  permissions: UserPermissions;
}

export const PermissionsCard: React.FC<PermissionsCardProps> = ({ permissions }) => {
  const features = [
    {
      name: 'Chatbots',
      icon: Bot,
      enabled: permissions.canCreateBots
    },
    {
      name: 'Automatisations',
      icon: Zap,
      enabled: permissions.canCreateAutomations
    },
    {
      name: 'IA Business',
      icon: BarChart3,
      enabled: permissions.canAccessBusiness
    },
    {
      name: 'IA Marketing',
      icon: TrendingUp,
      enabled: permissions.canAccessMarketing
    },
    {
      name: 'IA Gestion',
      icon: Settings,
      enabled: permissions.canAccessManagement
    }
  ];

  return (
    <Card className="uniform-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Fonctionnalités disponibles
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border-2 ${
              feature.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <feature.icon className={`w-8 h-8 mb-2 ${
              feature.enabled ? 'text-green-600' : 'text-gray-400'
            }`} />
            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
            <div className="text-xs text-gray-600">
              {feature.enabled ? 'Disponible' : 'Non autorisé'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
