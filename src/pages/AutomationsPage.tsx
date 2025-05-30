
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotAutomationCreator } from '@/components/automation/BotAutomationCreator';
import { AutomationBotChat } from '@/components/automation/AutomationBotChat';
import { 
  Workflow, 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Bot,
  MessageSquare,
  Eye,
  Settings,
  Pause,
  Play,
  Trash2
} from 'lucide-react';

interface AutomationBot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  chat_title: string;
  is_active: boolean;
  created_at: string;
  public_chat_url: string;
}

export const AutomationsPage: React.FC = () => {
  const [view, setView] = useState<'main' | 'create' | 'chat'>('main');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [automationBots, setAutomationBots] = useState<AutomationBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const staticAutomations = [
    { 
      name: 'Email de bienvenue', 
      status: 'Actif', 
      executions: 45, 
      type: 'Marketing', 
      lastRun: '2h',
      color: 'bg-green-500',
      description: 'Envoi automatique d\'emails de bienvenue'
    },
    { 
      name: 'Suivi des leads', 
      status: 'Actif', 
      executions: 23, 
      type: 'Business', 
      lastRun: '5h',
      color: 'bg-blue-500',
      description: 'Qualification et scoring automatique des leads'
    },
    { 
      name: 'Génération de rapports', 
      status: 'En pause', 
      executions: 12, 
      type: 'Gestion', 
      lastRun: '1j',
      color: 'bg-purple-500',
      description: 'Création automatique de rapports hebdomadaires'
    }
  ];

  useEffect(() => {
    fetchAutomationBots();
  }, []);

  const fetchAutomationBots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        setIsLoading(false);
        return;
      }

      const { data: botsData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', ownerData.id)
        .eq('chat_context', 'automation')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAutomationBots(botsData || []);

    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les bots automatisés",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBot = () => {
    setView('create');
  };

  const handleBotCreated = (botId: string) => {
    setSelectedBotId(botId);
    setView('chat');
    fetchAutomationBots(); // Rafraîchir la liste
  };

  const handleViewBot = (botId: string) => {
    setSelectedBotId(botId);
    setView('chat');
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bots')
        .update({ is_active: !currentStatus })
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Bot désactivé" : "Bot activé",
        description: `Le bot est maintenant ${currentStatus ? 'inactif' : 'actif'}`,
      });

      fetchAutomationBots();
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bot automatisé ?')) return;

    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: "Bot supprimé",
        description: "Le bot automatisé a été supprimé définitivement",
      });

      fetchAutomationBots();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bot",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Actif': return 'bg-green-100 text-green-800 border-green-200';
      case 'En pause': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Erreur': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Actif': return <CheckCircle className="w-4 h-4" />;
      case 'En pause': return <Pause className="w-4 h-4" />;
      case 'Erreur': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (view === 'create') {
    return (
      <BotAutomationCreator
        onBack={() => setView('main')}
        onBotCreated={handleBotCreated}
      />
    );
  }

  if (view === 'chat' && selectedBotId) {
    return (
      <AutomationBotChat
        botId={selectedBotId}
        onBack={() => {
          setView('main');
          setSelectedBotId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Automatisations</h1>
              <p className="text-gray-600">Automatisez vos flux métiers et créez des chatbots intelligents avec n8n.</p>
            </div>
            <Button 
              onClick={handleCreateBot}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle automatisation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Workflows actifs</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {staticAutomations.filter(a => a.status === 'Actif').length}
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Workflow className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Bots automatisés</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {automationBots.filter(bot => bot.is_active).length}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Exécutions ce mois</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {staticAutomations.reduce((sum, a) => sum + a.executions, 0)}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Temps économisé</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">24h</div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Bots Automatisés */}
        {automationBots.length > 0 && (
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 flex items-center">
              <Bot className="w-5 h-5 mr-2" />
              Mes Bots Automatisés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationBots.map((bot) => (
                <Card key={bot.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        bot.is_active ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Bot className={`w-5 h-5 ${
                          bot.is_active ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{bot.name}</h3>
                        <Badge variant={bot.is_active ? "default" : "secondary"} className="text-xs">
                          {bot.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                    {bot.description}
                  </p>

                  <div className="text-xs text-gray-500 mb-3">
                    Chat: {bot.chat_title}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1">
                      <Button
                        onClick={() => handleViewBot(bot.id)}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => toggleBotStatus(bot.id, bot.is_active)}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8"
                      >
                        {bot.is_active ? (
                          <Pause className="w-4 h-4 text-red-500" />
                        ) : (
                          <Play className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        onClick={() => deleteBot(bot.id)}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(bot.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Create New Workflow Section */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Créer un nouveau workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              onClick={handleCreateBot}
              className="p-6 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Bot Automatisé</h3>
                <p className="text-sm text-gray-600">Créer via webhook n8n</p>
              </div>
            </div>
            
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Éditeur visuel</h3>
                <p className="text-sm text-gray-600">Interface drag & drop</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Workflows traditionnels */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Workflows traditionnels</h2>
          <div className="space-y-4">
            {staticAutomations.map((automation, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${automation.color} rounded-lg flex items-center justify-center`}>
                    <Workflow className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                    <p className="text-gray-600 text-sm">{automation.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(automation.status)}`}
                      >
                        {getStatusIcon(automation.status)}
                        <span className="ml-1">{automation.status}</span>
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Dernière exécution: {automation.lastRun}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-gray-900 font-semibold">{automation.executions}</div>
                    <div className="text-gray-500 text-sm">Exécutions</div>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
