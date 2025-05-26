
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Bell, Settings, BarChart3 } from 'lucide-react';

export const QuickActionsCard: React.FC = () => {
  return (
    <Card className="uniform-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button className="uniform-button-secondary flex items-center space-x-2">
          <History className="w-4 h-4" />
          <span>Historique</span>
        </Button>
        <Button className="uniform-button-secondary flex items-center space-x-2">
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </Button>
        <Button className="uniform-button-secondary flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </Button>
        <Button className="uniform-button-secondary flex items-center space-x-2">
          <BarChart3 className="w-4 h-4" />
          <span>Analyses</span>
        </Button>
      </div>
    </Card>
  );
};
