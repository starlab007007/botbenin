import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import SimplifiedWhatsAppManager from '@/components/whatsapp/SimplifiedWhatsAppManager';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto px-4 py-8">
        <SimplifiedWhatsAppManager />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;