
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, User, Bot, Search, Filter, Download } from 'lucide-react';

interface Bot {
  id: string;
  name: string;
}

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

interface MessagesOverviewProps {
  bots: Bot[];
}

export const MessagesOverview: React.FC<MessagesOverviewProps> = ({ bots }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [messageType, setMessageType] = useState<string>('all');

  useEffect(() => {
    fetchMessages();
  }, [selectedBot, messageType]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
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
        .order('created_at', { ascending: false });

      if (selectedBot !== 'all') {
        query = query.eq('bot_id', selectedBot);
      }

      if (messageType !== 'all') {
        query = query.eq('message_type', messageType);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les messages.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = messages.filter(message =>
    message.message_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.bot_users?.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.bot_users?.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportMessages = () => {
    const csvData = filteredMessages.map(message => ({
      Bot: message.bots?.name || 'N/A',
      Utilisateur: message.bot_users?.user_name || message.bot_users?.user_email || message.bot_users?.session_id || 'Anonyme',
      Type: message.message_type,
      Message: message.message_content,
      Date: new Date(message.created_at).toLocaleString('fr-FR'),
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export réussi',
      description: 'Les messages ont été exportés avec succès.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-gray-600 mt-1">
            Consultez tous les messages de vos bots
          </p>
        </div>
        
        <Button onClick={exportMessages} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rechercher
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rechercher dans les messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot
              </label>
              <Select value={selectedBot} onValueChange={setSelectedBot}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les bots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les bots</SelectItem>
                  {bots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de message
              </label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="bot">Bot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">{filteredMessages.length}</div>
                <div className="text-sm text-gray-600">Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredMessages.filter(m => m.message_type === 'user').length}
                </div>
                <div className="text-sm text-gray-600">De l'utilisateur</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Bot className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredMessages.filter(m => m.message_type === 'bot').length}
                </div>
                <div className="text-sm text-gray-600">Du bot</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">
                  {new Set(filteredMessages.map(m => m.bot_users?.session_id || m.bot_users?.user_email)).size}
                </div>
                <div className="text-sm text-gray-600">Utilisateurs uniques</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des messages */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des conversations</CardTitle>
          <CardDescription>
            {filteredMessages.length} message(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun message trouvé
              </h3>
              <p className="text-gray-600">
                Aucun message ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredMessages.map((message) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {message.message_type === 'user' ? (
                        <User className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="font-medium">
                        {message.message_type === 'user' 
                          ? (message.bot_users?.user_name || message.bot_users?.user_email || 'Utilisateur anonyme')
                          : message.bots?.name || 'Bot'
                        }
                      </span>
                      <Badge variant={message.message_type === 'user' ? 'default' : 'secondary'}>
                        {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                    {message.message_content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
