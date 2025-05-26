
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Bot, Settings, Trash2, Copy, ExternalLink } from 'lucide-react';

interface Bot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
}

interface BotOwner {
  id: string;
  subscription_plan: string;
  max_bots: number;
}

interface BotManagementProps {
  bots: Bot[];
  setBots: React.Dispatch<React.SetStateAction<Bot[]>>;
  botOwner: BotOwner | null;
  isLoading: boolean;
}

export const BotManagement: React.FC<BotManagementProps> = ({ 
  bots, 
  setBots, 
  botOwner, 
  isLoading 
}) => {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhook_url: '',
  });
  const [creating, setCreating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('bots')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            webhook_url: formData.webhook_url,
            is_active: true,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setBots(prev => [data, ...prev]);
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', webhook_url: '' });
      
      toast({
        title: 'Bot créé',
        description: 'Votre bot a été créé avec succès !',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
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
        title: currentStatus ? 'Bot désactivé' : 'Bot activé',
        description: `Le bot a été ${currentStatus ? 'désactivé' : 'activé'} avec succès.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
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
        title: 'Bot supprimé',
        description: 'Le bot a été supprimé avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'URL copiée',
      description: 'L\'URL du webhook a été copiée dans le presse-papier.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const canCreateMoreBots = bots.length < (botOwner?.max_bots || 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Bots</h2>
          <p className="text-gray-600 mt-1">
            {bots.length} / {botOwner?.max_bots || 1} bots utilisés
          </p>
        </div>
        
        {canCreateMoreBots && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Créer un bot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau bot</DialogTitle>
                <DialogDescription>
                  Configurez votre nouveau chatbot IA
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={createBot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du bot
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Assistant Client"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Décrivez le rôle de votre bot..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Webhook
                  </label>
                  <Input
                    name="webhook_url"
                    value={formData.webhook_url}
                    onChange={handleInputChange}
                    placeholder="https://votre-webhook.com/endpoint"
                    type="url"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Création...' : 'Créer le bot'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun bot créé
            </h3>
            <p className="text-gray-600 mb-4">
              Commencez par créer votre premier chatbot IA.
            </p>
            {canCreateMoreBots && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer mon premier bot
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <Card key={bot.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <Bot className="w-5 h-5 text-blue-600 mr-2" />
                    <CardTitle className="text-lg">{bot.name}</CardTitle>
                  </div>
                  <Badge variant={bot.is_active ? "default" : "secondary"}>
                    {bot.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {bot.description || 'Aucune description'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Webhook URL:</span>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyWebhookUrl(bot.webhook_url)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(bot.webhook_url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(bot.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant={bot.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleBotStatus(bot.id, bot.is_active)}
                    >
                      {bot.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteBot(bot.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
