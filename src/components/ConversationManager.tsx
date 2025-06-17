
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { SecureDataManager } from '@/services/dashboard/secureDataManager';
import { 
  MessageSquare, 
  ArrowLeft,
  RefreshCw,
  Download,
  Users,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import our new paginated components
import { ConversationFilters } from '@/components/conversation-manager/ConversationFilters';
import { PaginatedConversationList } from '@/components/conversation-manager/PaginatedConversationList';
import { PaginatedContactList } from '@/components/conversation-manager/PaginatedContactList';
import { MessageView } from '@/components/conversation-manager/MessageView';
import { ContactMessageForm } from '@/components/conversation-manager/ContactMessageForm';

interface ConversationManagerProps {
  onBack: () => void;
}

interface BotConversation {
  id: string;
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

export const ConversationManager: React.FC<ConversationManagerProps> = ({ onBack }) => {
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<BotConversation | null>(null);
  const [messages, setMessages] = useState<MessageDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBot, setFilterBot] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('conversations');
  const [availableBots, setAvailableBots] = useState<{id: string, name: string}[]>([]);
  const [contactMessage, setContactMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(null);
  const [dataIntegrity, setDataIntegrity] = useState<any>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchData();
    verifyDataIntegrity();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchConversations(),
        fetchContacts(),
        fetchAvailableBots()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyDataIntegrity = async () => {
    try {
      const integrity = await SecureDataManager.verifyDataIntegrity();
      setDataIntegrity(integrity);
      
      if (!integrity.isValid) {
        toast({
          title: "Problèmes de données détectés",
          description: `${integrity.issues.length} problème(s) trouvé(s)`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur vérification intégrité:', error);
    }
  };

  const fetchAvailableBots = async () => {
    try {
      const botsData = await SecureDataManager.getOwnerBots();
      setAvailableBots(botsData);
    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const conversationsData = await SecureDataManager.getAllConversations();
      setConversations(conversationsData);
      console.log(`[ConversationManager] ${conversationsData.length} conversations récupérées`);
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      // Créer des contacts à partir des conversations
      const contactsMap = new Map<string, ContactInfo>();
      
      conversations.forEach(conv => {
        const key = `${conv.user_id}-${conv.user_email}`;
        
        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            user_id: conv.user_id,
            user_name: conv.user_name,
            user_email: conv.user_email,
            session_count: 0,
            message_count: 0,
            first_interaction: conv.session_start,
            last_interaction: conv.last_message_at,
            status: 'inactive'
          });
        }

        const contact = contactsMap.get(key)!;
        contact.session_count++;
        contact.message_count += conv.total_messages;
        
        // Mise à jour des dates
        if (new Date(conv.session_start) < new Date(contact.first_interaction)) {
          contact.first_interaction = conv.session_start;
        }
        
        if (new Date(conv.last_message_at) > new Date(contact.last_interaction)) {
          contact.last_interaction = conv.last_message_at;
        }

        // Statut actif si activité récente (24h)
        const isRecent = new Date(conv.last_message_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (isRecent) {
          contact.status = 'active';
        }
      });

      setContacts(Array.from(contactsMap.values()));
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    }
  };

  const fetchMessages = async (conversation: BotConversation) => {
    try {
      const messagesData = await SecureDataManager.getSessionMessages(
        conversation.bot_id, 
        conversation.session_id
      );

      const formattedMessages: MessageDetails[] = messagesData.map(msg => ({
        id: msg.id,
        content: msg.message_content,
        type: msg.message_type,
        timestamp: msg.created_at,
        user_name: msg.bot_users?.user_name || 'Utilisateur'
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const viewConversation = (conversation: BotConversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation);
  };

  const sendContactMessage = async () => {
    if (!selectedContact || !contactMessage.trim()) return;

    try {
      toast({
        title: "Message envoyé",
        description: `Message envoyé à ${selectedContact.user_name}`,
      });

      setContactMessage('');
      setSelectedContact(null);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const exportData = () => {
    const dataToExport = activeTab === 'conversations' ? conversations : contacts;
    const csvContent = [
      activeTab === 'conversations' 
        ? ['Bot', 'Utilisateur', 'Email', 'Messages', 'Dernière activité', 'Début de session']
        : ['Nom', 'Email', 'Sessions', 'Messages', 'Premier contact', 'Dernier contact', 'Statut'],
      ...dataToExport.map(item => 
        activeTab === 'conversations' 
          ? [
              (item as BotConversation).bot_name,
              (item as BotConversation).user_name,
              (item as BotConversation).user_email,
              (item as BotConversation).total_messages.toString(),
              new Date((item as BotConversation).last_message_at).toLocaleString('fr-FR'),
              new Date((item as BotConversation).session_start).toLocaleString('fr-FR')
            ]
          : [
              (item as ContactInfo).user_name,
              (item as ContactInfo).user_email,
              (item as ContactInfo).session_count.toString(),
              (item as ContactInfo).message_count.toString(),
              new Date((item as ContactInfo).first_interaction).toLocaleString('fr-FR'),
              new Date((item as ContactInfo).last_interaction).toLocaleString('fr-FR'),
              (item as ContactInfo).status
            ]
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.bot_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBot = filterBot === 'all' || conv.bot_id === filterBot;
    return matchesSearch && matchesBot;
  });

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Show message view when conversation is selected
  if (selectedConversation) {
    return (
      <MessageView
        conversation={selectedConversation}
        messages={messages}
        onBack={() => setSelectedConversation(null)}
        onContactUser={setSelectedContact}
      />
    );
  }

  // Show contact message form when contact is selected
  if (selectedContact) {
    return (
      <ContactMessageForm
        contact={selectedContact}
        message={contactMessage}
        onMessageChange={setContactMessage}
        onSendMessage={sendContactMessage}
        onBack={() => setSelectedContact(null)}
      />
    );
  }

  // Main conversation manager view
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
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Gestion Centralisée</h2>
                <p className="text-gray-600 text-sm">Conversations et contacts de tous vos bots</p>
                {dataIntegrity && (
                  <div className="flex items-center mt-1">
                    {dataIntegrity.isValid ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        <span className="text-xs">Données intègres</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-orange-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span className="text-xs">{dataIntegrity.issues.length} problème(s)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={verifyDataIntegrity} size="sm" className="w-full sm:w-auto">
                <CheckCircle className="w-4 h-4 mr-2" />
                Vérifier
              </Button>
              <Button variant="outline" onClick={fetchData} size="sm" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
              <Button variant="outline" onClick={exportData} size="sm" className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <ConversationFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterBot={filterBot}
          onFilterBotChange={setFilterBot}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          activeTab={activeTab}
          availableBots={availableBots}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="conversations" className="flex items-center space-x-1 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>Conversations ({filteredConversations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center space-x-1 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span>Contacts ({filteredContacts.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <PaginatedConversationList
              conversations={filteredConversations}
              isLoading={isLoading}
              onViewConversation={viewConversation}
              onContactUser={setSelectedContact}
              searchTerm={searchTerm}
              filterBot={filterBot}
            />
          </TabsContent>

          <TabsContent value="contacts">
            <PaginatedContactList
              contacts={filteredContacts}
              isLoading={isLoading}
              onContactUser={setSelectedContact}
              searchTerm={searchTerm}
              filterStatus={filterStatus}
            />
          </TabsContent>
        </Tabs>

        {/* Debug info pour les développeurs */}
        {dataIntegrity && !dataIntegrity.isValid && (
          <Card className="p-4 border-orange-200 bg-orange-50 mt-4">
            <h4 className="font-semibold text-orange-800 mb-2">Informations de diagnostic</h4>
            <div className="text-sm text-orange-700 space-y-1">
              {dataIntegrity.issues.map((issue: string, index: number) => (
                <div key={index}>• {issue}</div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
