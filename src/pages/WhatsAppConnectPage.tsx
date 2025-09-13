import React, { useState } from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WhatsAppConnectGuide from '@/components/whatsapp/WhatsAppConnectGuide';
import SimpleSessionManager from '@/components/whatsapp/SimpleSessionManager';
import BotWebhookLinker from '@/components/whatsapp/BotWebhookLinker';
import WebhookConfigModal from '@/components/whatsapp/WebhookConfigModal';
import WhatsAppWidgetConfig from '@/components/whatsapp/WhatsAppWidgetConfig';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { accounts } = useWhatsAppAccounts();
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [showBotLinker, setShowBotLinker] = useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Check if user has completed various setup steps
  const hasConnectedSessions = accounts?.some(account => account.status === 'WORKING') || false;
  const hasWebhookConfigured = accounts?.some(account => account.webhook_url) || false;
  const hasWidgetConfigured = false; // This would be based on actual widget configuration

  const handleConnectNumber = () => {
    setShowSessionManager(true);
  };

  const handleWebhookSetup = (sessionName?: string) => {
    if (sessionName) {
      setSelectedAccountId(sessionName);
    } else if (accounts && accounts.length > 0) {
      // Prendre la première session connectée disponible
      const connectedSession = accounts.find(account => account.status === 'WORKING');
      if (connectedSession) {
        setSelectedAccountId(connectedSession.session_name);
      }
    }
    setShowWebhookConfig(true);
  };

  const handleWidgetSetup = () => {
    setShowWidgetConfig(true);
  };

  const handleManageAgents = () => {
    setShowBotLinker(true);
  };

  // Obtenir les sessions connectées pour les passer au guide
  const connectedSessions = accounts?.filter(account => account.status === 'WORKING') || [];

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto p-6 space-y-6">
        <WhatsAppConnectGuide
          onConnectNumber={handleConnectNumber}
          onWebhookSetup={handleWebhookSetup}
          onWidgetSetup={handleWidgetSetup}
          onManageAgents={handleManageAgents}
          hasConnectedSessions={hasConnectedSessions}
          hasWebhookConfigured={hasWebhookConfigured}
          hasWidgetConfigured={hasWidgetConfigured}
          connectedSessions={connectedSessions}
        />

        {/* Session Manager Modal */}
        <Dialog open={showSessionManager} onOpenChange={setShowSessionManager}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>WhatsApp Session Manager</DialogTitle>
            </DialogHeader>
            <SimpleSessionManager />
          </DialogContent>
        </Dialog>

        {/* Webhook Configuration Modal */}
        <WebhookConfigModal 
          open={showWebhookConfig}
          onOpenChange={setShowWebhookConfig}
          sessionName={selectedAccountId}
        />

        {/* Bot Linker Modal */}
        <BotWebhookLinker 
          open={showBotLinker}
          onOpenChange={setShowBotLinker}
          sessionName={selectedAccountId}
        />

        {/* Widget Configuration Modal */}
        <WhatsAppWidgetConfig 
          open={showWidgetConfig}
          onOpenChange={setShowWidgetConfig}
        />
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;