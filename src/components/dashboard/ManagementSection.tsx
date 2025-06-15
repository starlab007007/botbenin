
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BotConversationControl } from "@/components/BotConversationControl";
import { ConversationManager } from "@/components/ConversationManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  MessageCircle,
  Users,
  Mail,
  ArrowLeft
} from 'lucide-react';

interface ManagementSectionProps {
  showConversationControlPanel: boolean;
  onToggleConversationControl: () => void;
}

type ManagementView = 'overview' | 'control' | 'manager';

export const ManagementSection: React.FC<ManagementSectionProps> = ({
  showConversationControlPanel,
  onToggleConversationControl
}) => {
  const [currentView, setCurrentView] = React.useState<ManagementView>('overview');
  const isMobile = useIsMobile();

  const handleShowConversationManager = () => {
    setCurrentView('manager');
  };

  const handleShowConversationControl = () => {
    setCurrentView('control');
    onToggleConversationControl();
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
  };

  if (currentView === 'manager') {
    return (
      <div className="w-full">
        <ConversationManager onBack={handleBackToOverview} />
      </div>
    );
  }

  if (currentView === 'control') {
    return (
      <div className="w-full">
        {isMobile && (
          <div className={`sticky top-0 z-10 bg-white border-b ${isMobile ? 'px-[2.5%]' : 'p-3'} mb-4`}>
            <Button variant="outline" onClick={handleBackToOverview} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </div>
        )}
        <BotConversationControl />
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className={`${isMobile ? 'px-[2.5%]' : 'p-4 sm:p-6'}`}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion Centralisée</h3>
            <p className="text-gray-600 text-sm">Accédez à toutes vos conversations et contacts</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleShowConversationManager}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Mail className="w-4 h-4 mr-2" />
              Gestion Conversations
            </Button>
            
            <Button 
              onClick={handleShowConversationControl}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contrôle Sessions
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-blue-600" />
              <div className="text-sm font-medium text-gray-900">Conversations</div>
              <div className="text-xs text-gray-600">Toutes les sessions de chat</div>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-green-600" />
              <div className="text-sm font-medium text-gray-900">Contacts</div>
              <div className="text-xs text-gray-600">Base de données utilisateurs</div>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
              <Mail className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-purple-600" />
              <div className="text-sm font-medium text-gray-900">Messagerie</div>
              <div className="text-xs text-gray-600">Contacter vos utilisateurs</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
