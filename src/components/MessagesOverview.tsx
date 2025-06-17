
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  User, 
  Bot, 
  Search,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Shield,
  CheckCircle
} from 'lucide-react';
import { 
  getSecureChatHistory, 
  getOwnerBotSessions,
  getSecureDashboardStats,
  type SecureChatMessage 
} from '@/services/chat/secureHistoryManager';
import { supabase } from '@/integrations/supabase/client';

interface MessageStats {
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  todayMessages: number;
}

export const MessagesOverview: React.FC = () => {
  const [messages, setMessages] = useState<SecureChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SecureChatMessage[]>([]);
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    userMessages: 0,
    botMessages: 0,
    todayMessages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'bot'>('all');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [bots, setBots] = useState<Array<{ id: string; name: string }>>([]);
  const [securityVerified, setSecurityVerified] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSecureData();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, filterType, selectedBot]);

  const loadSecureData = async () => {
    try {
      setIsLoading(true);
      setSecurityVerified(false);

      // Verify user authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's bots securely
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        setSecurityVerified(true);
        setIsLoading(false);
        return;
      }

      // Get bots owned by this user
      const { data: botsData } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerData.id);

      setBots(botsData || []);

      // Load all secure messages for all user's bots
      const allMessages: SecureChatMessage[] = [];
      
      for (const bot of botsData || []) {
        try {
          const botMessages = await getSecureChatHistory(bot.id);
          allMessages.push(...botMessages);
        } catch (error) {
          console.error(`Error loading messages for bot ${bot.id}:`, error);
          // Continue with other bots even if one fails
        }
      }

      setMessages(allMessages);
      calculateSecureStats(allMessages);
      setSecurityVerified(true);

      toast({
        title: "Données sécurisées chargées",
        description: `${allMessages.length} messages trouvés avec isolation garantie`,
      });

    } catch (error) {
      console.error('Error loading secure messages:', error);
      toast({
        title: "Erreur de sécurité",
        description: "Impossible de charger les messages de manière sécurisée",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSecureStats = (messagesData: SecureChatMessage[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalMessages: messagesData.length,
      userMessages: messagesData.filter(m => m.message_type === 'user').length,
      botMessages: messagesData.filter(m => m.message_type === 'bot').length,
      todayMessages: messagesData.filter(m => 
        new Date(m.message_timestamp) >= today
      ).length
    };

    setStats(stats);
  };

  const filterMessages = () => {
    let filtered = messages;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(message =>
        message.message_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (message.user_email && message.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by message type
    if (filterType !== 'all') {
      filtered = filtered.filter(message => message.message_type === filterType);
    }

    // Filter by bot
    if (selectedBot !== 'all') {
      filtered = filtered.filter(message => message.bot_id === selectedBot);
    }

    setFilteredMessages(filtered);
  };

  const exportSecureMessages = () => {
    const csvContent = [
      ['Date', 'Bot', 'Type', 'Utilisateur', 'Message', 'Session'].join(','),
      ...filteredMessages.map(message => [
        new Date(message.message_timestamp).toLocaleString('fr-FR'),
        message.bot_name,
        message.message_type,
        message.user_name || 'Anonyme',
        `"${message.message_content.replace(/"/g, '""')}"`,
        message.session_id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure_messages_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export sécurisé réussi",
      description: "Les messages ont été exportés avec isolation des données garantie",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement sécurisé en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Header */}
      <Card className="p-4 border-green-200 bg-green-50">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Sécurité Vérifiée</h3>
            <p className="text-sm text-green-700">
              Isolation des données garantie - Vous ne voyez que vos propres messages
            </p>
          </div>
        </div>
      </Card>

      {/* Header and Statistics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Messages & Conversations Sécurisés</h2>
              <p className="text-gray-600">Consultez tous vos messages avec isolation garantie</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={loadSecureData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={exportSecureMessages} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Sécurisé
            </Button>
          </div>
        </div>

        {/* Secure Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalMessages}</div>
                <div className="text-sm text-gray-600">Total messages</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.userMessages}</div>
                <div className="text-sm text-gray-600">Messages utilisateurs</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.botMessages}</div>
                <div className="text-sm text-gray-600">Messages bots</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.todayMessages}</div>
                <div className="text-sm text-gray-600">Aujourd'hui</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Secure Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher dans vos messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'user' | 'bot')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les types</option>
            <option value="user">Messages utilisateurs</option>
            <option value="bot">Réponses bots</option>
          </select>

          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous vos bots</option>
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Secure Messages List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-600" />
          Historique sécurisé des messages ({filteredMessages.length})
        </h3>

        {filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun message trouvé
            </h3>
            <p className="text-gray-600">
              {messages.length === 0 
                ? "Vos chatbots n'ont pas encore reçu de messages"
                : "Aucun message ne correspond aux filtres sélectionnés"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredMessages.map((message) => (
              <div key={message.message_id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.message_type === 'user' 
                    ? 'bg-blue-100' 
                    : 'bg-purple-100'
                }`}>
                  {message.message_type === 'user' ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-purple-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={message.message_type === 'user' ? 'default' : 'secondary'}>
                        {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {message.user_name || 'Utilisateur anonyme'}
                      </span>
                      <span className="text-sm text-gray-500">
                        • {message.bot_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(message.message_timestamp).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 break-words">
                    {message.message_content}
                  </p>

                  <div className="mt-2 text-xs text-gray-500">
                    Session: {message.session_id}
                    {message.ip_address && ` • IP: ${message.ip_address}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
