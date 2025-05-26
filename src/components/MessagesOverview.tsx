
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Search, Filter, Download, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatMessage {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  bot_users: {
    user_name: string;
    user_email: string;
    session_id: string;
  };
  bots: {
    name: string;
  };
}

interface Bot {
  id: string;
  name: string;
}

export const MessagesOverview: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le bot_owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      // Récupérer les bots
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerData.id);

      if (botsError) throw botsError;
      setBots(botsData || []);

      // Récupérer les messages avec jointures
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message_content,
          message_type,
          created_at,
          bot_users (
            user_name,
            user_email,
            session_id
          ),
          bots (
            name
          )
        `)
        .in('bot_id', botsData?.map(bot => bot.id) || [])
        .order('created_at', { ascending: false })
        .limit(100);

      if (messagesError) throw messagesError;
      setMessages(messagesData as ChatMessage[] || []);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.message_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.bot_users?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.bot_users?.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBot = selectedBot === 'all' || message.bots?.name === selectedBot;
    const matchesType = messageTypeFilter === 'all' || message.message_type === messageTypeFilter;
    
    return matchesSearch && matchesBot && matchesType;
  });

  const exportMessages = () => {
    const csvContent = [
      ['Date', 'Bot', 'Type', 'Utilisateur', 'Email', 'Message'],
      ...filteredMessages.map(msg => [
        new Date(msg.created_at).toLocaleString('fr-FR'),
        msg.bots?.name || 'N/A',
        msg.message_type,
        msg.bot_users?.user_name || 'Anonyme',
        msg.bot_users?.user_email || 'N/A',
        `"${msg.message_content.replace(/"/g, '""')}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `messages-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export réussi",
      description: "Les messages ont été exportés en CSV",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages des Chatbots</h2>
          <p className="text-gray-600">
            {filteredMessages.length} message(s) trouvé(s)
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={exportMessages} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher dans les messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedBot} onValueChange={setSelectedBot}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les bots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les bots</SelectItem>
              {bots.map((bot) => (
                <SelectItem key={bot.id} value={bot.name}>
                  {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={messageTypeFilter} onValueChange={setMessageTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type de message" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="user">Messages utilisateur</SelectItem>
              <SelectItem value="bot">Réponses du bot</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setSelectedBot('all');
            setMessageTypeFilter('all');
          }}>
            <Filter className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </Card>

      {/* Liste des messages */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun message trouvé</h3>
            <p className="text-gray-600">
              {messages.length === 0 
                ? "Aucun message n'a encore été envoyé à vos chatbots"
                : "Aucun message ne correspond à vos critères de recherche"
              }
            </p>
          </Card>
        ) : (
          filteredMessages.map((message) => (
            <Card key={message.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant={message.message_type === 'user' ? 'default' : 'secondary'}>
                    {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                  </Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {message.bots?.name || 'Bot inconnu'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {message.bot_users?.user_name || 'Utilisateur anonyme'}
                  </span>
                  {message.bot_users?.user_email && (
                    <span className="text-sm text-gray-400">
                      ({message.bot_users.user_email})
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {message.message_content}
                </p>
              </div>

              {message.bot_users?.session_id && (
                <div className="mt-2 text-xs text-gray-400">
                  Session: {message.bot_users.session_id}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
