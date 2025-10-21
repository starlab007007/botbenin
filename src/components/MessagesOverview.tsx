
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SafeText } from '@/components/security/SafeText';
import { useToast } from '@/hooks/use-toast';
import { SecureDataManager } from '@/services/dashboard/secureDataManager';
import { 
  MessageSquare, 
  User, 
  Bot, 
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  bot_users: {
    user_name?: string;
    user_email?: string;
    session_id?: string;
  };
  bots: {
    name: string;
  };
}

interface MessageStats {
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  todayMessages: number;
}

export const MessagesOverview: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
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
  const [dataIntegrity, setDataIntegrity] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    fetchBots();
    verifyDataIntegrity();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, filterType, selectedBot]);

  const fetchBots = async () => {
    try {
      const botsData = await SecureDataManager.getOwnerBots();
      setBots(botsData);
    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer tous les messages ou ceux d'un bot spécifique
      const botIdFilter = selectedBot !== 'all' ? selectedBot : undefined;
      const messagesData = await SecureDataManager.getAllMessages(botIdFilter);
      
      setMessages(messagesData);
      calculateStats(messagesData);

      console.log(`[MessagesOverview] ${messagesData.length} messages récupérés`);

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

  const verifyDataIntegrity = async () => {
    try {
      const integrity = await SecureDataManager.verifyDataIntegrity();
      setDataIntegrity(integrity);
      
      if (!integrity.isValid) {
        toast({
          title: "Problèmes détectés",
          description: `${integrity.issues.length} problème(s) d'intégrité des données`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur vérification intégrité:', error);
    }
  };

  const calculateStats = (messagesData: ChatMessage[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalMessages: messagesData.length,
      userMessages: messagesData.filter(m => m.message_type === 'user').length,
      botMessages: messagesData.filter(m => m.message_type === 'bot').length,
      todayMessages: messagesData.filter(m => new Date(m.created_at) >= today).length
    };

    setStats(stats);
  };

  const filterMessages = () => {
    let filtered = messages;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(message =>
        message.message_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.bot_users?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.bot_users?.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.bots.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par type de message
    if (filterType !== 'all') {
      filtered = filtered.filter(message => message.message_type === filterType);
    }

    // Filtre par bot
    if (selectedBot !== 'all') {
      const selectedBotData = bots.find(bot => bot.id === selectedBot);
      if (selectedBotData) {
        filtered = filtered.filter(message => message.bots.name === selectedBotData.name);
      }
    }

    setFilteredMessages(filtered);
  };

  const exportMessages = () => {
    const csvContent = [
      ['Date', 'Bot', 'Type', 'Utilisateur', 'Message', 'Session'].join(','),
      ...filteredMessages.map(message => [
        new Date(message.created_at).toLocaleString('fr-FR'),
        message.bots.name,
        message.message_type,
        message.bot_users?.user_name || message.bot_users?.user_email || 'Anonyme',
        `"${message.message_content.replace(/"/g, '""')}"`,
        message.bot_users?.session_id || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

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
      {/* En-tête et vérification d'intégrité */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Messages & Conversations</h2>
            <p className="text-gray-600">Consultez tous les messages de vos chatbots</p>
            {dataIntegrity && (
              <div className="flex items-center mt-2">
                {dataIntegrity.isValid ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Données intègres</span>
                  </div>
                ) : (
                  <div className="flex items-center text-orange-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-sm">{dataIntegrity.issues.length} problème(s) détecté(s)</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button onClick={verifyDataIntegrity} variant="outline" size="sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Vérifier
            </Button>
            <Button onClick={fetchMessages} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={exportMessages} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Statistiques */}
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

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher dans les messages..."
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
            onChange={(e) => {
              setSelectedBot(e.target.value);
              // Recharger les messages si on change de bot
              if (e.target.value !== selectedBot) {
                setTimeout(fetchMessages, 100);
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les bots</option>
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Liste des messages */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Historique des messages ({filteredMessages.length})
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
              <div key={message.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.message_type === 'user' 
                    ? 'bg-blue-100' 
                    : 'bg-purple-100'
                }`}>
                  {message.message_type === 'user' ? (
                    <User className={`w-4 h-4 ${
                      message.message_type === 'user' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
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
                        {message.bot_users?.user_name || message.bot_users?.user_email || 'Utilisateur anonyme'}
                      </span>
                      <span className="text-sm text-gray-500">
                        • {message.bots.name}
                      </span>
                      {message.bot_users?.session_id && (
                        <span className="text-xs text-gray-400">
                          Session: {message.bot_users.session_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(message.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 break-words">
                    <SafeText maxLength={500}>{message.message_content}</SafeText>
                  </p>

                  {message.ip_address && (
                    <div className="mt-2 text-xs text-gray-500">
                      IP: {message.ip_address}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Debug info pour les développeurs */}
      {dataIntegrity && !dataIntegrity.isValid && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <h4 className="font-semibold text-orange-800 mb-2">Informations de diagnostic</h4>
          <div className="text-sm text-orange-700 space-y-1">
            {dataIntegrity.issues.map((issue: string, index: number) => (
              <div key={index}>• {issue}</div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
