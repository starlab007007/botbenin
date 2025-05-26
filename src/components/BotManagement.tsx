
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  MessageSquare
} from 'lucide-react';

interface Bot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  api_key: string;
  is_active: boolean;
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhook_url: '',
    api_key: ''
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
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      // Récupérer les bots
      const { data: botsData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBots(botsData || []);

      // Récupérer les statistiques pour chaque bot
      if (botsData && botsData.length > 0) {
        await fetchBotsStats(botsData.map(bot => bot.id));
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

  const fetchBotsStats = async (botIds: string[]) => {
    try {
      const stats: Record<string, BotStats> = {};

      for (const botId of botIds) {
        // Messages total
        const { data: messagesData } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('bot_id', botId);

        // Utilisateurs uniques
        const { data: usersData } = await supabase
          .from('bot_users')
          .select('id, last_active')
          .eq('bot_id', botId);

        // Actifs aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeToday = usersData?.filter(user => 
          new Date(user.last_active) >= today
        ).length || 0;

        stats[botId] = {
          totalMessages: messagesData?.length || 0,
          totalUsers: usersData?.length || 0,
          activeToday
        };
      }

      setBotStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const createBot = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { error } = await supabase
        .from('bots')
        .insert({
          owner_id: ownerData.id,
          name: formData.name,
          description: formData.description,
          webhook_url: formData.webhook_url,
          api_key: formData.api_key,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Chatbot créé",
        description: "Votre nouveau chatbot a été créé avec succès",
      });

      setFormData({ name: '', description: '', webhook_url: '', api_key: '' });
      setShowCreateForm(false);
      fetchBots();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le chatbot",
        variant: "destructive",
      });
    }
  };

  const updateBot = async () => {
    if (!editingBot) return;

    try {
      const { error } = await supabase
        .from('bots')
        .update({
          name: formData.name,
          description: formData.description,
          webhook_url: formData.webhook_url,
          api_key: formData.api_key
        })
        .eq('id', editingBot.id);

      if (error) throw error;

      toast({
        title: "Chatbot mis à jour",
        description: "Les modifications ont été sauvegardées",
      });

      setEditingBot(null);
      setFormData({ name: '', description: '', webhook_url: '', api_key: '' });
      fetchBots();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le chatbot",
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

  const startEdit = (bot: Bot) => {
    setEditingBot(bot);
    setFormData({
      name: bot.name,
      description: bot.description,
      webhook_url: bot.webhook_url,
      api_key: bot.api_key
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingBot(null);
    setFormData({ name: '', description: '', webhook_url: '', api_key: '' });
    setShowCreateForm(false);
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
      {/* En-tête avec bouton de création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Chatbots</h2>
          <p className="text-gray-600">Gérez vos chatbots et consultez leurs performances</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Chatbot
        </Button>
      </div>

      {/* Formulaire de création/édition */}
      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingBot ? 'Modifier le chatbot' : 'Créer un nouveau chatbot'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du chatbot
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Mon Chatbot Assistant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé API
              </label>
              <Input
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="sk-..."
                type="password"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Assistant intelligent pour..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Webhook (optionnel)
              </label>
              <Input
                value={formData.webhook_url}
                onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="https://votre-webhook.com/endpoint"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={editingBot ? updateBot : createBot}
              className="bg-green-600 hover:bg-green-700"
            >
              {editingBot ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button 
              onClick={cancelEdit}
              variant="outline"
            >
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {/* Liste des chatbots */}
      {bots.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun chatbot créé
          </h3>
          <p className="text-gray-600 mb-4">
            Commencez par créer votre premier chatbot pour démarrer
          </p>
          <Button 
            onClick={() => setShowCreateForm(true)}
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

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => startEdit(bot)}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
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
