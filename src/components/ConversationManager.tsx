import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  MessageSquare, 
  ArrowLeft,
  RefreshCw,
  Download,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import our new components
import { ConversationFilters } from '@/components/conversation-manager/ConversationFilters';
import { ConversationList } from '@/components/conversation-manager/ConversationList';
import { ContactList } from '@/components/conversation-manager/ContactList';
import { MessageView } from '@/components/conversation-manager/MessageView';
import { ContactMessageForm } from '@/components/conversation-manager/ContactMessageForm';

interface ConversationManagerProps {
  onBack: () => void;
}

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
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchData();
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

  const fetchAvailableBots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { data: botsData } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerData.id);

      setAvailableBots(botsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { data: conversationsData, error } = await supabase
        .from('bot_conversation_history')
        .select(`
          bot_id,
          bot_name,
          bot_user_id,
          user_name,
          user_email,
          session_id,
          session_start,
          message_timestamp,
          message_content,
          message_type
        `)
        .eq('owner_id', ownerData.id)
        .order('message_timestamp', { ascending: false });

      if (error) throw error;

      const conversationMap = new Map<string, BotConversation>();
      
      conversationsData?.forEach(row => {
        const sessionKey = `${row.bot_id}-${row.session_id}`;
        
        if (!conversationMap.has(sessionKey)) {
          conversationMap.set(sessionKey, {
            bot_id: row.bot_id,
            bot_name: row.bot_name || 'Bot sans nom',
            user_id: row.bot_user_id,
            user_name: row.user_name || 'Utilisateur anonyme',
            user_email: row.user_email || '',
            session_id: row.session_id,
            total_messages: 0,
            last_message_at: row.message_timestamp,
            last_message_content: row.message_content || '',
            session_start: row.session_start,
            is_active: false
          });
        }

        const conversation = conversationMap.get(sessionKey)!;
        conversation.total_messages++;
        
        if (new Date(row.message_timestamp) > new Date(conversation.last_message_at)) {
          conversation.last_message_at = row.message_timestamp;
          conversation.last_message_content = row.message_content || '';
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { data: contactsData, error } = await supabase
        .from('bot_users')
        .select(`
          id,
          user_name,
          user_email,
          created_at,
          last_active,
          bots!inner(owner_id)
        `)
        .eq('bots.owner_id', ownerData.id);

      if (error) throw error;

      const enrichedContacts: ContactInfo[] = [];
      
      for (const contact of contactsData || []) {
        const { data: messageStats } = await supabase
          .from('chat_messages')
          .select('id, created_at, bot_id')
          .eq('bot_user_id', contact.id);

        const { data: sessionStats } = await supabase
          .from('enhanced_chat_sessions')
          .select('id, started_at')
          .eq('bot_user_id', contact.id);

        const isActive = contact.last_active && 
          new Date(contact.last_active) > new Date(Date.now() - 24 * 60 * 60 * 1000);

        enrichedContacts.push({
          user_id: contact.id,
          user_name: contact.user_name || 'Utilisateur anonyme',
          user_email: contact.user_email || '',
          session_count: sessionStats?.length || 0,
          message_count: messageStats?.length || 0,
          first_interaction: contact.created_at,
          last_interaction: contact.last_active,
          status: isActive ? 'active' : 'inactive'
        });
      }

      setContacts(enrichedContacts);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    }
  };

  const fetchMessages = async (conversation: BotConversation) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('bot_conversation_history')
        .select(`
          message_id,
          message_content,
          message_type,
          message_timestamp,
          user_name
        `)
        .eq('bot_id', conversation.bot_id)
        .eq('session_id', conversation.session_id)
        .order('message_timestamp', { ascending: true });

      if (error) throw error;

      const formattedMessages: MessageDetails[] = messagesData?.map(msg => ({
        id: msg.message_id,
        content: msg.message_content || '',
        type: msg.message_type as 'user' | 'bot',
        timestamp: msg.message_timestamp,
        user_name: msg.user_name || 'Utilisateur'
      })) || [];

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
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
              <span>Conversations ({conversations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center space-x-1 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span>Contacts ({contacts.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <ConversationList
              conversations={filteredConversations}
              isLoading={isLoading}
              onViewConversation={viewConversation}
              onContactUser={setSelectedContact}
            />
          </TabsContent>

          <TabsContent value="contacts">
            <ContactList
              contacts={filteredContacts}
              isLoading={isLoading}
              onContactUser={setSelectedContact}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
