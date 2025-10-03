
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users,
  CreditCard,
  Target,
  Megaphone
} from 'lucide-react';

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const actions = [
    { id: 'leads', label: 'Mes Lead', icon: Users },
    { id: 'subscription', label: 'Mon Abonnement', icon: CreditCard },
    { id: 'prospects', label: 'Mes Prospects', icon: Target },
    { id: 'campaigns', label: 'Mes Campagnes', icon: Megaphone }
  ];

  return (
    <Card className="uniform-card p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Actions rapides</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {actions.map((action) => (
          <Button 
            key={action.id}
            className="uniform-button-secondary flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 h-auto py-3 sm:py-2"
            onClick={() => onActionClick?.(action.id)}
          >
            <action.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
