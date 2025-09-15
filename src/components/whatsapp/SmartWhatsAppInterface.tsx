import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import SimpleSessionManager from './SimpleSessionManager';
import WebhookConfigModal from './WebhookConfigModal';

interface SmartWhatsAppInterfaceProps {
  onSessionUpdate?: () => void;
}

const SmartWhatsAppInterface: React.FC<SmartWhatsAppInterfaceProps> = ({
  onSessionUpdate
}) => {
  const { accounts, loadData } = useWhatsAppAccounts();
  
  const [showSessionManager, setShowSessionManager] = useState(true); // Toujours afficher le gestionnaire
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');

  // État des connexions
  const connectedSessions = accounts?.filter(account => account.status === 'WORKING') || [];

  return (
    <div className="space-y-6">
      {/* Gestionnaire de Session en page complète */}
      {showSessionManager && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSessionManager(false);
                      loadData();
                      onSessionUpdate?.();
                    }}
                  >
                    ← Retour
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Gestionnaire de Session WhatsApp</h1>
                    <p className="text-muted-foreground">Gérez vos sessions WhatsApp et configurez vos automatisations</p>
                  </div>
                </div>
              </div>
            </div>
            <SimpleSessionManager />
          </div>
        </div>
      )}

      <WebhookConfigModal
        open={showWebhookConfig}
        onOpenChange={setShowWebhookConfig}
        sessionName={selectedSessionName}
      />
    </div>
  );
};

export default SmartWhatsAppInterface;