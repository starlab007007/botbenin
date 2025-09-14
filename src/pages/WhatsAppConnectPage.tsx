import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import SmartWhatsAppInterface from '@/components/whatsapp/SmartWhatsAppInterface';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto p-6 space-y-6">
        <SmartWhatsAppInterface />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;