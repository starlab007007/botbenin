
import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Bot, 
  Zap, 
  BarChart3, 
  TrendingUp, 
  Settings 
} from 'lucide-react';
import { UserPermissions } from './DashboardStats';

interface FeatureCardsProps {
  permissions: UserPermissions;
}

export const FeatureCards: React.FC<FeatureCardsProps> = ({ permissions }) => {
  const features = [
    {
      name: 'Chatbots Webhook',
      description: 'Toujours disponible',
      icon: Bot,
      available: true,
      color: 'green'
    },
    {
      name: 'Automatisations',
      description: permissions.canCreateAutomations ? 'Disponible' : 'Non autorisé',
      icon: Zap,
      available: permissions.canCreateAutomations,
      color: permissions.canCreateAutomations ? 'green' : 'gray'
    },
    {
      name: 'IA Business',
      description: permissions.canAccessBusiness ? 'Disponible' : 'Non autorisé',
      icon: BarChart3,
      available: permissions.canAccessBusiness,
      color: permissions.canAccessBusiness ? 'green' : 'gray'
    },
    {
      name: 'IA Marketing',
      description: permissions.canAccessMarketing ? 'Disponible' : 'Non autorisé',
      icon: TrendingUp,
      available: permissions.canAccessMarketing,
      color: permissions.canAccessMarketing ? 'green' : 'gray'
    },
    {
      name: 'IA Gestion',
      description: permissions.canAccessManagement ? 'Disponible' : 'Non autorisé',
      icon: Settings,
      available: permissions.canAccessManagement,
      color: permissions.canAccessManagement ? 'green' : 'gray'
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
              feature.color === 'green' 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <feature.icon className={`w-8 h-8 mb-2 ${
              feature.color === 'green' ? 'text-green-600' : 'text-gray-400'
            }`} />
            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
            <div className="text-xs text-gray-600">{feature.description}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
