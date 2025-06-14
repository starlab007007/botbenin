
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mail,
  History,
  Bell,
  Settings 
} from 'lucide-react';

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const actions = [
    { id: 'conversations', label: 'Contrôle Conversations', icon: Mail },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  return (
    <Card className="uniform-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Button 
            key={action.id}
            className="uniform-button-secondary flex items-center space-x-2"
            onClick={() => onActionClick?.(action.id)}
          >
            <action.icon className="w-4 h-4" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
