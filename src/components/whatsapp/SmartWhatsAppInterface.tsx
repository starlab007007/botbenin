import React, { useState } from 'react';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import SimpleSessionManager from './SimpleSessionManager';
import WebhookConfigModal from './WebhookConfigModal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface SmartWhatsAppInterfaceProps {
  onSessionUpdate?: () => void;
}

const SmartWhatsAppInterface: React.FC<SmartWhatsAppInterfaceProps> = ({
  onSessionUpdate
}) => {
  const { loadData } = useWhatsAppAccounts();
  
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');

  return (
    <PermissionGuard 
      anyPermissions={['whatsapp.view', 'whatsapp.connect', 'whatsapp.manage.sessions']}
      fallbackMessage="Vous n'avez pas la permission d'accéder à la gestion WhatsApp. Contactez votre administrateur."
    >
      <div className="space-y-6">
        {/* Gestionnaire de Session WhatsApp */}
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Gestionnaire de Session WhatsApp</h1>
            <p className="text-muted-foreground">Gérez vos sessions WhatsApp et configurez vos automatisations</p>
          </div>
          <SimpleSessionManager />
        </div>

        <WebhookConfigModal
          open={showWebhookConfig}
          onOpenChange={setShowWebhookConfig}
          sessionName={selectedSessionName}
        />
      </div>
    </PermissionGuard>
  );
};

export default SmartWhatsAppInterface;