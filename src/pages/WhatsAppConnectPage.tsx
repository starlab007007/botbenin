import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import WhatsAppDashboard from '@/components/whatsapp/WhatsAppDashboard';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <WhatsAppDashboard />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;