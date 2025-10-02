import React, { useState, useEffect } from 'react';
import { StandardizedBotManager } from '@/components/StandardizedBotManager';
import { SocialSharingManager } from '@/components/SocialSharingManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotConfigService, StandardBotConfig } from '@/services/botConfigService';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { 
  Bot, 
  Plus, 
  Edit, 
  Trash2, 
  Share2, 
  ExternalLink,
  Settings,
  BarChart3,
  CheckCircle,
  XCircle,
  Lock,
  AlertCircle
} from 'lucide-react';

export const BotManagementPage: React.FC = () => {
  const [bots, setBots] = useState<StandardBotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBot, setEditingBot] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<StandardBotConfig | null>(null);
  const [botCount, setBotCount] = useState(0);
  const [maxBots, setMaxBots] = useState(10); // Fixed to 10 for free plan
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, session } = useAuth();

  useEffect(() => {
    // Auth is now guaranteed by ProtectedRoute wrapper
    fetchBots();
  }, []);

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
        setMaxBots(10); // Always set to 10 for free plan
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
      setMaxBots(10); // Always set to 10 for free plan
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
    // Auth check removed - handled by ProtectedRoute
    if (botCount >= 10) { // Fixed limit check to 10
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

  const handleAuthButtonClick = () => {
    setShowAuthModal(true);
  };

  const getBotValidationStatus = (bot: StandardBotConfig) => {
    const validation = BotConfigService.validateBotConfig(bot);
    return validation;
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

  // Auth check removed - handled by ProtectedRoute wrapper in App.tsx
  
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

  const isLimitReached = botCount >= 10; // Fixed limit check to 10

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

      {/* Affichage des limites */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">
                Plan Gratuit - Utilisation des bots
              </p>
              <p className="text-blue-700 text-sm">
                {botCount} / 10 bots créés
              </p>
            </div>
            <div className="text-right">
              <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min((botCount / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message de limite atteinte */}
      {isLimitReached && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  Limite de création atteinte
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Vous avez atteint la limite de 10 bots pour votre plan gratuit. 
                  Supprimez un bot existant ou passez à un plan supérieur pour créer de nouveaux bots.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            const validation = getBotValidationStatus(bot);
            
            return (
              <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{bot.name}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {bot.description}
                      </p>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      {validation.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {bot.is_active ? (
                        <div className="w-3 h-3 bg-green-400 rounded-full" />
                      ) : (
                        <div className="w-3 h-3 bg-gray-400 rounded-full" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline">
                      {bot.chat_context}
                    </Badge>
                    {bot.share_enabled && (
                      <Badge variant="outline" className="text-green-600">
                        Public
                      </Badge>
                    )}
                    {!validation.isValid && (
                      <Badge variant="outline" className="text-red-600">
                        Configuration invalide
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={() => setEditingBot(bot.id)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    
                    <div className="flex space-x-2">
                      {bot.share_enabled && validation.isValid && (
                        <Button
                          onClick={() => copyShareUrl(bot)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Copier lien
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => setSelectedBot(bot)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Gérer
                      </Button>
                    </div>
                    
                    <Button
                      onClick={() => handleDeleteBot(bot.id)}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
