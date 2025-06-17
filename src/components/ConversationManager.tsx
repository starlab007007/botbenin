
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  MessageSquare, 
  ArrowLeft,
  RefreshCw,
  Users,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import the secure conversation manager
import { SecureConversationManager } from '@/components/secure-conversation/SecureConversationManager';

// Import legacy components for backward compatibility
import { ConversationFilters } from '@/components/conversation-manager/ConversationFilters';
import { PaginatedConversationList } from '@/components/conversation-manager/PaginatedConversationList';
import { PaginatedContactList } from '@/components/conversation-manager/PaginatedContactList';
import { MessageView } from '@/components/conversation-manager/MessageView';
import { ContactMessageForm } from '@/components/conversation-manager/ContactMessageForm';

// Legacy interfaces for backward compatibility
interface BotConversation {
  bot_id: string;
  bot_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  session_id: string;
  total_messages: number;
  last_message_at: string;
  last_message_content: string;
  session_start: string;
  is_active: boolean;
}

interface MessageDetails {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: string;
  user_name: string;
}

interface ContactInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  session_count: number;
  message_count: number;
  first_interaction: string;
  last_interaction: string;
  status: 'active' | 'inactive';
}

interface ConversationManagerProps {
  onBack: () => void;
}

export const ConversationManager: React.FC<ConversationManagerProps> = ({ onBack }) => {
  const [useSecureMode, setUseSecureMode] = useState(true);
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<BotConversation | null>(null);
  const [messages, setMessages] = useState<MessageDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // If secure mode is enabled, use the secure conversation manager
  if (useSecureMode) {
    return <SecureConversationManager onBack={onBack} />;
  }

  // Legacy mode toggle
  const toggleSecureMode = () => {
    setUseSecureMode(!useSecureMode);
    toast({
      title: useSecureMode ? "Mode Standard Activé" : "Mode Sécurisé Activé",
      description: useSecureMode 
        ? "Utilisation des anciennes méthodes de récupération" 
        : "Utilisation des méthodes sécurisées avec isolation des données",
    });
  };

  // Legacy implementation would go here...
  // For now, we'll show a message recommending the secure mode

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className={`w-full max-w-none ${isMobile ? 'px-[2.5%]' : 'p-2 sm:p-4 lg:p-6'}`}>
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Gestion des Conversations</h2>
                <p className="text-gray-600 text-sm">Mode standard (non recommandé)</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="default" onClick={toggleSecureMode} className="w-full sm:w-auto">
                <Shield className="w-4 h-4 mr-2" />
                Activer le Mode Sécurisé
              </Button>
            </div>
          </div>
        </div>

        {/* Warning Card */}
        <Card className="mb-6 p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Mode Standard Détecté</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Pour garantir une isolation complète des données entre propriétaires, 
                nous recommandons fortement l'utilisation du <strong>Mode Sécurisé</strong>.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSecureMode}
                className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Passer au Mode Sécurisé
              </Button>
            </div>
          </div>
        </Card>

        {/* Legacy content placeholder */}
        <Card className="p-6">
          <div className="text-center py-8">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Mode Standard
            </h3>
            <p className="text-gray-600 mb-4">
              Ce mode utilise les anciennes méthodes de récupération des données.
              Pour une sécurité optimale, activez le Mode Sécurisé.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
