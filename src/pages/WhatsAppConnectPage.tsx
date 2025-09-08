import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import SimpleSessionManager from '@/components/whatsapp/SimpleSessionManager';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connect</h1>
            <p className="text-muted-foreground">
              Gérez vos sessions WhatsApp et leurs statistiques
            </p>
          </div>
        </div>

        <SimpleSessionManager />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;