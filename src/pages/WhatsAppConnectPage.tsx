import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import ComprehensiveWhatsAppManager from '@/components/whatsapp/ComprehensiveWhatsAppManager';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto px-4 py-8">
        <ComprehensiveWhatsAppManager />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;