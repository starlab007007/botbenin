
import React, { useState, useEffect } from 'react';
import { StandardizedBotManager } from '@/components/StandardizedBotManager';
import { SocialSharingManager } from '@/components/SocialSharingManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotConfigService, StandardBotConfig } from '@/services/botConfigService';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Plus, BarChart3, Settings, Share2 } from 'lucide-react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { BotLimitDisplay } from '@/components/bot-management/BotLimitDisplay';
import { BotCard } from '@/components/bot-management-page/BotCard';

export const BotManagementPage: React.FC = () => {
  const [bots, setBots] = useState<StandardBotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBot, setEditingBot] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<StandardBotConfig | null>(null);
  const [botCount, setBotCount] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchBots();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchBots = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        setBotCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBots(data || []);
      setBotCount((data || []).length);
    } catch (error) {
      console.error('Erreur lors du chargement des bots:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos bots",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBotSaved = (bot: StandardBotConfig) => {
    setShowCreateForm(false);
    setEditingBot(null);
    fetchBots();
  };

  const handleCreateBot = () => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    if (botCount >= 10) {
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint la limite de 10 bots pour votre plan gratuit",
        variant: "destructive",
      });
      return;
    }

    setShowCreateForm(true);
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bot ?')) return;

    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: "Bot supprimé",
        description: "Le bot a été supprimé avec succès",
      });

      fetchBots();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bot",
        variant: "destructive",
      });
    }
  };

  const getBotShareUrl = (bot: StandardBotConfig) => {
    return `${window.location.origin}/bot/${bot.id}`;
  };

  const copyShareUrl = async (bot: StandardBotConfig) => {
    const url = getBotShareUrl(bot);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Lien copié !",
        description: "Le lien de partage a été copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  if (showCreateForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <StandardizedBotManager
          onSave={handleBotSaved}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  if (editingBot) {
    return (
      <div className="container mx-auto px-4 py-8">
        <StandardizedBotManager
          botId={editingBot}
          onSave={handleBotSaved}
          onCancel={() => setEditingBot(null)}
        />
      </div>
    );
  }

  if (selectedBot) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            onClick={() => setSelectedBot(null)}
            variant="outline"
          >
            ← Retour à la liste
          </Button>
        </div>

        <Tabs defaultValue="sharing" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sharing">
              <Share2 className="w-4 h-4 mr-2" />
              Partage
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistiques
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sharing">
            <SocialSharingManager
              botId={selectedBot.id}
              botName={selectedBot.name}
              shortUrl={getBotShareUrl(selectedBot)}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques du Bot</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Les statistiques détaillées seront bientôt disponibles.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <StandardizedBotManager
              botId={selectedBot.id}
              onSave={handleBotSaved}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isLimitReached = botCount >= 10;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Bots</h1>
          <p className="text-gray-600 mt-2">
            Créez et gérez vos assistants IA avec une configuration standardisée
          </p>
        </div>
        <Button 
          onClick={handleCreateBot}
          disabled={isLimitReached}
          className={isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isLimitReached ? 'Limite atteinte' : 'Nouveau Bot'}
        </Button>
      </div>

      <BotLimitDisplay 
        botCount={botCount} 
        maxBots={10}
        isAuthenticated={isAuthenticated} 
      />

      <AuthGuard isAuthenticated={isAuthenticated}>
        {bots.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Aucun bot créé
              </h2>
              <p className="text-gray-600 mb-6">
                Créez votre premier bot pour commencer à utiliser la plateforme
              </p>
              <Button 
                onClick={handleCreateBot}
                disabled={isLimitReached}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer mon premier bot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => {
              const validation = BotConfigService.validateBotConfig(bot);
              
              return (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  isValid={validation.isValid}
                  onEdit={setEditingBot}
                  onDelete={handleDeleteBot}
                  onManage={setSelectedBot}
                  onCopyLink={copyShareUrl}
                />
              );
            })}
          </div>
        )}
      </AuthGuard>
    </div>
  );
};
