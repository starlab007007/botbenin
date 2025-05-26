
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Bot, Settings, Trash2, Eye, Copy, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

interface BotOwner {
  id: string;
  subscription_plan: string;
  max_bots: number;
}

export const BotManagement: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [botOwner, setBotOwner] = useState<BotOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBot, setNewBot] = useState({
    name: '',
    description: '',
    webhook_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBotOwnerData();
  }, []);

  const fetchBotOwnerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les informations du bot_owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('bot_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (ownerError) {
        console.error('Erreur lors de la récupération du bot_owner:', ownerError);
        return;
      }

      setBotOwner(ownerData);

      // Récupérer les bots
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (botsError) {
        console.error('Erreur lors de la récupération des bots:', botsError);
        return;
      }

      setBots(botsData || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos bots",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBot = async () => {
    if (!botOwner || !newBot.name.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (bots.length >= botOwner.max_bots) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez créer que ${botOwner.max_bots} bot(s) avec votre abonnement ${botOwner.subscription_plan}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const apiKey = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('bots')
        .insert([
          {
            owner_id: botOwner.id,
            name: newBot.name,
            description: newBot.description,
            webhook_url: newBot.webhook_url,
            api_key: apiKey,
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setBots(prev => [data, ...prev]);
      setNewBot({ name: '', description: '', webhook_url: '' });
      setShowCreateDialog(false);

      toast({
        title: "Bot créé",
        description: `Votre bot "${newBot.name}" a été créé avec succès`,
      });
    } catch (error) {
      console.error('Erreur lors de la création du bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le bot",
        variant: "destructive",
      });
    }
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bots')
        .update({ is_active: !currentStatus })
        .eq('id', botId);

      if (error) throw error;

      setBots(prev => prev.map(bot => 
        bot.id === botId ? { ...bot, is_active: !currentStatus } : bot
      ));

      toast({
        title: "Statut mis à jour",
        description: `Bot ${!currentStatus ? 'activé' : 'désactivé'}`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bot ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      setBots(prev => prev.filter(bot => bot.id !== botId));

      toast({
        title: "Bot supprimé",
        description: "Le bot a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bot",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "Texte copié dans le presse-papiers",
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
      {/* Header avec statistiques */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Chatbots</h2>
          <p className="text-gray-600">
            {bots.length}/{botOwner?.max_bots || 0} bots utilisés 
            (Plan {botOwner?.subscription_plan || 'free'})
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={bots.length >= (botOwner?.max_bots || 0)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Bot
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un nouveau chatbot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du bot *
                </label>
                <Input
                  value={newBot.name}
                  onChange={(e) => setNewBot(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mon Assistant IA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={newBot.description}
                  onChange={(e) => setNewBot(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de votre chatbot..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Webhook (optionnel)
                </label>
                <Input
                  value={newBot.webhook_url}
                  onChange={(e) => setNewBot(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://your-webhook-url.com"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={createBot} className="bg-blue-600 hover:bg-blue-700">
                  Créer le Bot
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des bots */}
      <div className="grid gap-6">
        {bots.length === 0 ? (
          <Card className="p-8 text-center">
            <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun chatbot créé</h3>
            <p className="text-gray-600 mb-4">
              Créez votre premier chatbot pour commencer à interagir avec vos utilisateurs
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier bot
            </Button>
          </Card>
        ) : (
          bots.map((bot) => (
            <Card key={bot.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                    <p className="text-gray-600 text-sm">{bot.description || 'Aucune description'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={bot.is_active ? "default" : "secondary"}>
                    {bot.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleBotStatus(bot.id, bot.is_active)}
                  >
                    {bot.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1 truncate">
                      {bot.api_key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(bot.api_key)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {bot.webhook_url && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Webhook URL</label>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1 truncate">
                        {bot.webhook_url}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(bot.webhook_url)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-xs text-gray-500">
                  Créé le {new Date(bot.created_at).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-3 h-3 mr-1" />
                    Messages
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-3 h-3 mr-1" />
                    Config
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteBot(bot.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
