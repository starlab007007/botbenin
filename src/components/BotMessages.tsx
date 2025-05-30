
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  User, 
  Search, 
  Calendar,
  ArrowLeft,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotMessagesProps {
  botId: string;
  botName: string;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  bot_user_id: string;
  user_agent: string;
  ip_address: string;
  metadata: any;
}

interface BotUser {
  id: string;
  user_name: string;
  user_email: string;
  session_id: string;
  created_at: string;
  last_active: string;
}

export const BotMessages: React.FC<BotMessagesProps> = ({ botId, botName, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<Record<string, BotUser>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'bot'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, [botId]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Type assertion to ensure compatibility with our interface
      const typedMessages: ChatMessage[] = (messagesData || []).map(msg => ({
        ...msg,
        message_type: (msg.message_type === 'user' || msg.message_type === 'bot') ? msg.message_type : 'user'
      }));

      setMessages(typedMessages);

    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('bot_users')
        .select('*')
        .eq('bot_id', botId);

      if (error) throw error;

      const usersMap: Record<string, BotUser> = {};
      usersData?.forEach(user => {
        usersMap[user.id] = user;
      });
      setUsers(usersMap);

    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.message_content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || message.message_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const exportMessages = () => {
    const csvContent = [
      ['Date', 'Type', 'Utilisateur', 'Message', 'IP', 'User Agent'].join(','),
      ...filteredMessages.map(message => [
        new Date(message.created_at).toLocaleString('fr-FR'),
        message.message_type,
        users[message.bot_user_id]?.user_name || 'Anonyme',
        `"${message.message_content.replace(/"/g, '""')}"`,
        message.ip_address || '',
        `"${message.user_agent?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `messages_${botName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Messages - {botName}</h2>
            <p className="text-gray-600">Conversations et interactions avec votre bot</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchMessages}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={exportMessages}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher dans les messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Tous
              </Button>
              <Button
                variant={filterType === 'user' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('user')}
              >
                Utilisateurs
              </Button>
              <Button
                variant={filterType === 'bot' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('bot')}
              >
                Bot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des messages */}
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
      ) : filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun message trouvé
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Aucun message ne correspond à votre recherche.' : 'Aucune conversation n\'a encore eu lieu avec ce bot.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => {
            const user = users[message.bot_user_id];
            return (
              <Card key={message.id} className={`${
                message.message_type === 'user' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.message_type === 'user' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {message.message_type === 'user' ? (
                          <User className={`w-4 h-4 ${message.message_type === 'user' ? 'text-blue-600' : 'text-green-600'}`} />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {message.message_type === 'user' 
                              ? (user?.user_name || 'Utilisateur anonyme')
                              : botName
                            }
                          </span>
                          <Badge variant={message.message_type === 'user' ? 'secondary' : 'default'}>
                            {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(message.created_at).toLocaleString('fr-FR')}</span>
                          {message.ip_address && (
                            <>
                              <span>•</span>
                              <span>{message.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-gray-900 leading-relaxed">
                    {message.message_content}
                  </div>

                  {user && message.message_type === 'user' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        <strong>Session:</strong> {user.session_id} • 
                        <strong> Email:</strong> {user.user_email || 'Non fourni'} • 
                        <strong> Dernière activité:</strong> {new Date(user.last_active).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
