
import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface AccountStatsProps {
  userStats: {
    total_bots: number;
    total_messages: number;
    total_automations: number;
    unread_notifications: number;
  } | null;
}

export const AccountStats: React.FC<AccountStatsProps> = ({ userStats }) => {
  return (
    <Card className="uniform-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <Activity className="w-5 h-5 inline mr-2" />
        Résumé du compte
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {userStats?.total_bots || 0}
          </div>
          <div className="text-sm text-gray-600">Chatbots</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {userStats?.total_messages || 0}
          </div>
          <div className="text-sm text-gray-600">Messages</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {userStats?.total_automations || 0}
          </div>
          <div className="text-sm text-gray-600">Automations</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {userStats?.unread_notifications || 0}
          </div>
          <div className="text-sm text-gray-600">Notifications</div>
        </div>
      </div>
    </Card>
  );
};
