
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BotConversationControl } from "@/components/BotConversationControl";
import { 
  MessageCircle,
  Users,
  Mail 
} from 'lucide-react';

interface ManagementSectionProps {
  showConversationControlPanel: boolean;
  onToggleConversationControl: () => void;
}

export const ManagementSection: React.FC<ManagementSectionProps> = ({
  showConversationControlPanel,
  onToggleConversationControl
}) => {
  return (
    <Card className="uniform-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion Centralisée</h3>
          <p className="text-gray-600">Accédez à toutes vos conversations et contacts</p>
        </div>
        <Button 
          onClick={onToggleConversationControl}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contrôle Conversations
        </Button>
      </div>
      
      {showConversationControlPanel && (
        <div className="mt-8">
          <BotConversationControl />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
          <MessageCircle className="w-8 h-8 mb-2 text-blue-600" />
          <div className="text-sm font-medium text-gray-900">Conversations</div>
          <div className="text-xs text-gray-600">Toutes les sessions de chat</div>
        </div>
        
        <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
          <Users className="w-8 h-8 mb-2 text-green-600" />
          <div className="text-sm font-medium text-gray-900">Contacts</div>
          <div className="text-xs text-gray-600">Base de données utilisateurs</div>
        </div>
        
        <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
          <Mail className="w-8 h-8 mb-2 text-purple-600" />
          <div className="text-sm font-medium text-gray-900">Messagerie</div>
          <div className="text-xs text-gray-600">Contacter vos utilisateurs</div>
        </div>
      </div>
    </Card>
  );
};
