import React from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import ComprehensiveWhatsAppManager from '@/components/whatsapp/ComprehensiveWhatsAppManager';
import { WAHATestDiagnostic } from '@/components/whatsapp/WAHATestDiagnostic';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto px-4 py-8">
        <WAHATestDiagnostic />
        <ComprehensiveWhatsAppManager />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;