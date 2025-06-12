
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotAutomationCreator } from '@/components/automation/BotAutomationCreator';
import { DetailedBotAnalytics } from '@/components/DetailedBotAnalytics';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { 
  Bot, 
  Plus, 
  Settings, 
  Trash2, 
  Eye, 
  Edit3,
  Power,
  PowerOff,
  BarChart3,
  Users,
  MessageSquare,
  Share,
  Copy,
  ExternalLink,
  Play,
  MessageCircle,
  Home
} from 'lucide-react';

interface Bot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  api_key: string;
  is_active: boolean;
  chat_title: string;
  chat_context: string;
  share_enabled: boolean;
  public_chat_url: string;
  created_at: string;
  updated_at: string;
}

interface BotStats {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

export const BotManagement: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [botStats, setBotStats] = useState<Record<string, BotStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'list' | 'create' | 'analytics'>('dashboard');
  const [selectedBotForAnalytics, setSelectedBotForAnalytics] = useState<{ id: string; name: string } | null>(null);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhook_url: '',
    api_key: '',
    chat_title: 'Assistant IA',
    chat_context: 'general',
    share_enabled: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le bot_owner
      let { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        // Créer un bot_owner si il n'existe pas
        const { data: newOwner } = await supabase
          .from('bot_owners')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        
        ownerData = newOwner;
      }

      if (!ownerData) return;

      // Récupérer les bots
      const { data: botsData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBots(botsData || []);

      // Récupérer les statistiques depuis la nouvelle vue
      if (botsData && botsData.length > 0) {
        await fetchBotsStatsFromView(botsData.map(bot => bot.id));
      }

    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les chatbots",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBotsStatsFromView = async (botIds: string[]) => {
    try {
      const { data: statsData, error } = await supabase
        .from('detailed_bot_stats')
        .select('bot_id, total_unique_users, total_messages, messages_24h')
        .in('bot_id', botIds);

      if (error) throw error;

      const stats: Record<string, BotStats> = {};
      statsData?.forEach(stat => {
        stats[stat.bot_id] = {
          totalMessages: stat.total_messages || 0,
          totalUsers: stat.total_unique_users || 0,
          activeToday: stat.messages_24h || 0
        };
      });

      setBotStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleBotCreated = (botId: string) => {
    console.log('Bot créé avec config identique au restaurant:', botId);
    setCurrentView('list');
    fetchBots(); // Recharger la liste des bots
    toast({
      title: "Succès !",
      description: "Votre chatbot a été créé avec la même connectivité N8N que le bot restaurant",
    });
  };

  const testBot = (bot: Bot) => {
    // Ouvrir le bot dans une nouvelle fenêtre avec la même interface que les autres chats
    const chatUrl = `/chat?bot=${bot.id}&context=${bot.chat_context}&title=${encodeURIComponent(bot.chat_title)}`;
    console.log('Test du bot avec config identique restaurant:', chatUrl);
    window.open(chatUrl, '_blank');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: `${label} copié dans le presse-papiers`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  const toggleBotStatus = async (bot: Bot) => {
    try {
      const { error } = await supabase
        .from('bots')
        .update({ is_active: !bot.is_active })
        .eq('id', bot.id);

      if (error) throw error;

      toast({
        title: bot.is_active ? "Bot désactivé" : "Bot activé",
        description: `Le chatbot ${bot.name} est maintenant ${bot.is_active ? 'inactif' : 'actif'}`,
      });

      fetchBots();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le statut du bot",
        variant: "destructive",
      });
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce chatbot ?')) return;

    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: "Chatbot supprimé",
        description: "Le chatbot a été supprimé définitivement",
      });

      fetchBots();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le chatbot",
        variant: "destructive",
      });
    }
  };

  const viewAnalytics = (botId: string, botName: string) => {
    setSelectedBotForAnalytics({ id: botId, name: botName });
    setCurrentView('analytics');
  };

  // Gestion des vues
  if (currentView === 'create') {
    return (
      <BotAutomationCreator
        onBack={() => setCurrentView('list')}
        onBotCreated={handleBotCreated}
      />
    );
  }

  if (currentView === 'analytics' && selectedBotForAnalytics) {
    return (
      <DetailedBotAnalytics
        botId={selectedBotForAnalytics.id}
        botName={selectedBotForAnalytics.name}
        onBack={() => {
          setCurrentView('dashboard');
          setSelectedBotForAnalytics(null);
        }}
      />
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Navigation entre les vues */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'outline'}
              onClick={() => setCurrentView('dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={currentView === 'list' ? 'default' : 'outline'}
              onClick={() => setCurrentView('list')}
            >
              <Bot className="w-4 h-4 mr-2" />
              Mes Bots
            </Button>
          </div>
          <Button 
            onClick={() => setCurrentView('create')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Chatbot
          </Button>
        </div>

        <OwnerDashboard onViewBotAnalytics={viewAnalytics} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation entre les vues */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant={currentView === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setCurrentView('dashboard')}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={currentView === 'list' ? 'default' : 'outline'}
            onClick={() => setCurrentView('list')}
          >
            <Bot className="w-4 h-4 mr-2" />
            Mes Bots
          </Button>
        </div>
        <Button 
          onClick={() => setCurrentView('create')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Chatbot
        </Button>
      </div>

      {/* Vue liste des bots */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mes Chatbots</h2>
        <p className="text-gray-600 mb-6">Créez et gérez vos chatbots avec connectivité N8N identique au bot restaurant</p>
      </div>

      {/* Liste des chatbots */}
      {bots.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun chatbot créé
          </h3>
          <p className="text-gray-600 mb-4">
            Créez votre premier chatbot avec connectivité N8N identique au bot restaurant
          </p>
          <Button 
            onClick={() => setCurrentView('create')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer mon premier chatbot
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => {
            const stats = botStats[bot.id] || { totalMessages: 0, totalUsers: 0, activeToday: 0 };
            
            return (
              <Card key={bot.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      bot.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Bot className={`w-5 h-5 ${
                        bot.is_active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                      <Badge variant={bot.is_active ? "default" : "secondary"}>
                        {bot.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => toggleBotStatus(bot)}
                    variant="ghost"
                    size="sm"
                    className="p-2"
                  >
                    {bot.is_active ? (
                      <PowerOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Power className="w-4 h-4 text-green-500" />
                    )}
                  </Button>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {bot.description || 'Aucune description'}
                </p>

                {/* Titre et contexte du chat */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Chat: {bot.chat_title}</div>
                  <div className="text-xs text-gray-500">Contexte: {bot.chat_context}</div>
                  <div className="text-xs text-green-600 mt-1">✅ N8N connecté (identique restaurant)</div>
                  <div className="text-xs text-blue-600">🔗 Webhook: {bot.webhook_url}</div>
                </div>

                {/* URL publique et partage */}
                {bot.share_enabled && bot.public_chat_url && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700">Lien public</span>
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => copyToClipboard(bot.public_chat_url, 'Lien public')}
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => window.open(bot.public_chat_url, '_blank')}
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 truncate">
                      {bot.public_chat_url}
                    </div>
                  </div>
                )}

                {/* Statistiques */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{stats.totalMessages}</div>
                    <div className="text-xs text-gray-500">Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{stats.totalUsers}</div>
                    <div className="text-xs text-gray-500">Utilisateurs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{stats.activeToday}</div>
                    <div className="text-xs text-gray-500">Actifs</div>
                  </div>
                </div>

                {/* Actions principales */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    onClick={() => testBot(bot)}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Ouvrir Chat
                  </Button>
                  <Button
                    onClick={() => viewAnalytics(bot.id, bot.name)}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Analytics
                  </Button>
                </div>

                {/* Actions secondaires */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => deleteBot(bot.id)}
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(bot.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
