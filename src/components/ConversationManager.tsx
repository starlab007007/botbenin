
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  User, 
  Search, 
  Calendar,
  Clock,
  Mail,
  Phone,
  ArrowLeft,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Send,
  Users,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

      // Récupérer toutes les conversations avec détails
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

      // Grouper par session pour créer des conversations
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
        
        // Garder le message le plus récent
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

      // Récupérer les contacts avec statistiques
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

      // Enrichir avec les statistiques de messages
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
      // Ici vous pourriez implémenter l'envoi d'email ou de notification
      // Pour l'instant, on simule l'envoi
      
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

  if (selectedConversation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setSelectedConversation(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Conversation avec {selectedConversation.user_name}
              </h2>
              <p className="text-gray-600">
                Bot: {selectedConversation.bot_name} • {selectedConversation.total_messages} messages
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setSelectedContact({
              user_id: selectedConversation.user_id,
              user_name: selectedConversation.user_name,
              user_email: selectedConversation.user_email,
              session_count: 1,
              message_count: selectedConversation.total_messages,
              first_interaction: selectedConversation.session_start,
              last_interaction: selectedConversation.last_message_at,
              status: 'active'
            })}>
              <Mail className="w-4 h-4 mr-2" />
              Contacter
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Messages de la conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {new Date(message.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedContact) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setSelectedContact(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Contacter {selectedContact.user_name}
              </h2>
              <p className="text-gray-600">{selectedContact.user_email}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Envoyer un message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tapez votre message ici..."
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={sendContactMessage} disabled={!contactMessage.trim()}>
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </Button>
              <Button variant="outline" onClick={() => setSelectedContact(null)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion Centralisée</h2>
            <p className="text-gray-600">Conversations, messages et contacts de tous vos bots</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher utilisateurs, emails, bots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {activeTab === 'conversations' ? (
              <Select value={filterBot} onValueChange={setFilterBot}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par bot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les bots</SelectItem>
                  {availableBots.map(bot => (
                    <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversations" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Conversations ({conversations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Contacts ({contacts.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucune conversation trouvée
                </h3>
                <p className="text-gray-600">
                  Aucune conversation ne correspond à vos critères de recherche.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((conversation) => (
                <Card key={`${conversation.bot_id}-${conversation.session_id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{conversation.user_name}</h3>
                            <Badge variant="secondary">{conversation.bot_name}</Badge>
                            <Badge variant={conversation.is_active ? 'default' : 'secondary'}>
                              {conversation.total_messages} messages
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{conversation.user_email}</p>
                          <p className="text-gray-700 text-sm line-clamp-2">
                            Dernier message: {conversation.last_message_content}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Début: {new Date(conversation.session_start).toLocaleString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Dernier: {new Date(conversation.last_message_at).toLocaleString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => viewConversation(conversation)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          onClick={() => setSelectedContact({
                            user_id: conversation.user_id,
                            user_name: conversation.user_name,
                            user_email: conversation.user_email,
                            session_count: 1,
                            message_count: conversation.total_messages,
                            first_interaction: conversation.session_start,
                            last_interaction: conversation.last_message_at,
                            status: 'active'
                          })}
                          variant="outline"
                          size="sm"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Contact
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun contact trouvé
                </h3>
                <p className="text-gray-600">
                  Aucun contact ne correspond à vos critères de recherche.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <Card key={contact.user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          contact.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <User className={`w-6 h-6 ${
                            contact.status === 'active' ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{contact.user_name}</h3>
                            <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                              {contact.status === 'active' ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{contact.user_email}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Sessions:</span>
                              <span className="ml-2 font-medium">{contact.session_count}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Messages:</span>
                              <span className="ml-2 font-medium">{contact.message_count}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Premier: {new Date(contact.first_interaction).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="w-3 h-3" />
                              <span>Dernier: {new Date(contact.last_interaction).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedContact(contact)}
                          variant="outline"
                          size="sm"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Contacter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
