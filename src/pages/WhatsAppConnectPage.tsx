import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import WAHANativeDashboard from '@/components/whatsapp/WAHANativeDashboard';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <WAHANativeDashboard />
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;