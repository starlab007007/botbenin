import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotAutomationCreator } from '@/components/automation/BotAutomationCreator';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { ShortenedLinksManager } from '@/components/ShortenedLinksManager';
import { ConversationManager } from '@/components/ConversationManager';
import { initializeVisitorTracking } from '@/utils/visitorTracking';
import { copyToClipboard } from '@/lib/utils';
import { FaWhatsapp } from 'react-icons/fa';
import QRCode from 'qrcode';
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
  Share2,
  Copy,
  ExternalLink,
  Play,
  MessageCircle,
  Home,
  Link,
  Mail,
  Activity,
  Phone,
  QrCode,
  Download,
  Lock,
  AlertCircle
} from 'lucide-react';
import { BotManagerNav } from "./BotManagerNav";
import { QRCodeModal } from "./QRCodeModal";
import { BotCard } from "./BotCard";
import { cleanPublicUrl } from "./botManagementUtils";
import { useAuth } from '@/contexts/AuthContext';

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
  display_in_live_chat: boolean;
}

interface BotStats {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

type ViewType = 'dashboard' | 'list' | 'create' | 'analytics' | 'share' | 'conversations';

export const BotManagement: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [botStats, setBotStats] = useState<Record<string, BotStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedBotForAnalytics, setSelectedBotForAnalytics] = useState<{ id: string; name: string } | null>(null);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [selectedBotForSharing, setSelectedBotForSharing] = useState<{ id: string; name: string } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState<string | null>(null);
  const [botCount, setBotCount] = useState(0);
  const [maxBots, setMaxBots] = useState(10);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le bot_owner
      let { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        // Créer un bot_owner si il n'existe pas
        const { data: newOwner } = await supabase
          .from('bot_owners')
          .insert({ 
            user_id: user.id,
            subscription_plan: 'free',
            max_bots: 10
          })
          .select('id, max_bots')
          .single();
        
        ownerData = newOwner;
      }

      if (!ownerData) return;

      // Récupérer les bots avec display_in_live_chat
      const { data: botsData, error } = await supabase
        .from('bots')
        .select(`
          id,
          name,
          description,
          webhook_url,
          api_key,
          is_active,
          chat_title,
          chat_context,
          share_enabled,
          public_chat_url,
          created_at,
          updated_at,
          display_in_live_chat
        `)
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Assurer que display_in_live_chat a une valeur
      const formattedBots: Bot[] = (botsData || []).map(bot => ({
        id: bot.id,
        name: bot.name,
        description: bot.description,
        webhook_url: bot.webhook_url,
        api_key: bot.api_key,
        is_active: bot.is_active,
        chat_title: bot.chat_title,
        chat_context: bot.chat_context,
        share_enabled: bot.share_enabled,
        public_chat_url: bot.public_chat_url,
        created_at: bot.created_at,
        updated_at: bot.updated_at,
        display_in_live_chat: bot.display_in_live_chat ?? false
      }));

      setBots(formattedBots);
      setBotCount(formattedBots.length);
      setMaxBots(ownerData.max_bots);

      // Récupérer les statistiques depuis la nouvelle vue detailed_bot_stats
      if (formattedBots && formattedBots.length > 0) {
        await fetchBotsStatsFromView(formattedBots.map(bot => bot.id));
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
      console.log('Récupération des statistiques pour les bots:', botIds);
      
      const { data: statsData, error } = await supabase
        .from('detailed_bot_stats')
        .select('bot_id, total_unique_users, total_messages, active_users_24h')
        .in('bot_id', botIds);

      if (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        return;
      }

      console.log('Statistiques récupérées:', statsData);

      const stats: Record<string, BotStats> = {};
      statsData?.forEach(stat => {
        stats[stat.bot_id] = {
          totalMessages: stat.total_messages || 0,
          totalUsers: stat.total_unique_users || 0,
          activeToday: stat.active_users_24h || 0
        };
      });

      console.log('Statistiques formatées:', stats);
      setBotStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleBotCreated = (botId: string) => {
    console.log('Bot créé avec tracking avancé:', botId);
    setCurrentView('list');
    fetchBots();
    toast({
      title: "Succès !",
      description: "Votre chatbot a été créé avec tracking avancé des visiteurs",
    });
  };

  const handleCreateBot = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour créer un chatbot",
        variant: "destructive",
      });
      return;
    }

    if (botCount >= maxBots) {
      toast({
        title: "Limite atteinte",
        description: `Vous avez atteint la limite de ${maxBots} chatbots pour votre plan`,
        variant: "destructive",
      });
      return;
    }

    setCurrentView('create');
  };

  const testBot = async (bot: Bot) => {
    try {
      console.log('=== OUVERTURE CHAT BOT SPÉCIFIQUE ===');
      console.log('Bot sélectionné:', {
        id: bot.id,
        name: bot.name,
        webhook_url: bot.webhook_url,
        chat_title: bot.chat_title,
        chat_context: bot.chat_context,
        is_active: bot.is_active
      });

      if (!bot.is_active) {
        toast({
          title: "Bot inactif",
          description: `Le bot "${bot.name}" est actuellement désactivé. Activez-le pour pouvoir le tester.`,
          variant: "destructive",
        });
        return;
      }

      if (!bot.webhook_url || bot.webhook_url.trim() === '') {
        toast({
          title: "Configuration manquante",
          description: `Le bot "${bot.name}" n'a pas de webhook URL configuré.`,
          variant: "destructive",
        });
        return;
      }

      await initializeVisitorTracking(bot.id, 'bot_test');
      
      const chatParams = new URLSearchParams({
        bot: bot.id,
        webhook: encodeURIComponent(bot.webhook_url),
        context: bot.chat_context || 'automation',
        title: bot.chat_title || bot.name,
        test: 'true',
        bot_name: bot.name
      });

      const chatUrl = `/chat?${chatParams.toString()}`;
      
      console.log('URL de chat générée:', chatUrl);
      console.log('Paramètres transmis:', {
        botId: bot.id,
        webhookUrl: bot.webhook_url,
        chatTitle: bot.chat_title,
        chatContext: bot.chat_context,
        botName: bot.name
      });

      const chatWindow = window.open(chatUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!chatWindow) {
        toast({
          title: "Popup bloqué",
          description: "Veuillez autoriser les popups pour ouvrir le chat en nouvelle fenêtre.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `Chat ouvert - ${bot.name}`,
          description: "Le chat du bot s'ouvre dans une nouvelle fenêtre",
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du chat:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'ouvrir le chat pour "${bot.name}"`,
        variant: "destructive",
      });
    }
  };

  const shareQRCode = async (botName: string) => {
    if (!qrCodeUrl) return;
    
    try {
      // Message personnalisé pour le partage du QR Code
      const customMessage = `🔗 Scannez ce QR Code pour accéder directement à ${botName} - votre assistant IA intelligent disponible 24/7 !`;
      
      // Convertir le data URL en blob
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], `qr-code-${botName}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `QR Code - ${botName}`,
          text: customMessage,
          files: [file]
        });
        
        toast({
          title: "QR Code partagé",
          description: `QR Code de ${botName} partagé avec succès`,
        });
      } else {
        // Fallback: partager via WhatsApp avec le message personnalisé
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(customMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        toast({
          title: "Partage WhatsApp",
          description: `Message personnalisé envoyé via WhatsApp pour ${botName}`,
        });
      }
    } catch (error) {
      console.error('Erreur lors du partage du QR Code:', error);
      toast({
        title: "Erreur de partage",
        description: "Impossible de partager le QR Code",
        variant: "destructive",
      });
    }
  };

  const shareOnWhatsApp = (bot: Bot) => {
    // S'assurer qu'on a un lien public valide
    let shareUrl = bot.public_chat_url;
    
    // Si pas de lien public, créer un lien vers le bot public
    if (!shareUrl) {
      shareUrl = `https://bot.bj/bot/${bot.id}`;
    }
    
    // Nettoyer le lien pour enlever "ia." si présent
    shareUrl = shareUrl.replace(/https:\/\/ia\.bot\.bj/g, 'https://bot.bj');
    
    console.log('=== PARTAGE WHATSAPP ===');
    console.log('Bot:', bot.name);
    console.log('Lien public original:', bot.public_chat_url);
    console.log('Lien nettoyé pour partage:', shareUrl);

    // Message personnalisé pour WhatsApp avec le lien nettoyé
    const customMessage = `🤖 Découvrez ${bot.name} - votre assistant IA intelligent disponible 24/7 ! 

💬 Cliquez ici pour démarrer la conversation : ${shareUrl}

✨ Assistance instantanée et personnalisée - Aucune inscription requise !`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(customMessage)}`;
    
    // Ouvrir WhatsApp avec le message pré-rempli
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: `Partage WhatsApp - ${bot.name}`,
      description: "WhatsApp s'ouvre avec le lien public nettoyé et un message personnalisé",
    });
  };

  const handleCopyToClipboard = async (text: string, description: string) => {
    const result = await copyToClipboard(text, description);
    toast({
      title: result.success ? "Copié !" : "Erreur",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  const generateQRCode = async (url: string, botName: string) => {
    try {
      // Nettoyer l'URL pour le QR Code aussi
      const cleanUrl = url.replace(/https:\/\/ia\.bot\.bj/g, 'https://bot.bj');
      
      const qrCodeDataUrl = await QRCode.toDataURL(cleanUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQrCodeUrl(qrCodeDataUrl);
      setShowQrCode(cleanUrl);
      
      toast({
        title: "QR Code généré",
        description: `QR Code créé pour ${botName} avec lien nettoyé`,
      });
    } catch (error) {
      console.error('Erreur lors de la génération du QR Code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le QR Code",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = (botName: string) => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-${botName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code téléchargé",
      description: `QR Code de ${botName} téléchargé avec succès`,
    });
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

  const toggleLiveChatDisplay = async (bot: Bot) => {
    try {
      const newDisplayValue = !bot.display_in_live_chat;
      
      const { error } = await supabase
        .from('bots')
        .update({ display_in_live_chat: newDisplayValue })
        .eq('id', bot.id);

      if (error) throw error;

      toast({
        title: newDisplayValue ? "Bot ajouté au chat live" : "Bot retiré du chat live",
        description: `${bot.name} ${newDisplayValue ? 'apparaîtra' : 'n\'apparaîtra plus'} dans la page Chat IA`,
      });

      fetchBots();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut live chat:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'affichage du bot dans le chat live",
        variant: "destructive",
      });
    }
  };

  const viewAnalytics = (botId: string, botName: string) => {
    setSelectedBotForAnalytics({ id: botId, name: botName });
    setCurrentView('analytics');
  };

  const viewSharing = (botId: string, botName: string) => {
    setSelectedBotForSharing({ id: botId, name: botName });
    setCurrentView('share');
  };

  // Navigation Renderer Component
  const renderNavigation = () => (
    <div className="flex flex-wrap gap-2">
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
      <Button
        variant={currentView === 'conversations' ? 'default' : 'outline'}
        onClick={() => setCurrentView('conversations')}
      >
        <Mail className="w-4 h-4 mr-2" />
        Conversations
      </Button>
    </div>
  );

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
      <CompleteBotAnalytics
        botId={selectedBotForAnalytics.id}
        botName={selectedBotForAnalytics.name}
        onBack={() => {
          setCurrentView('dashboard');
          setSelectedBotForAnalytics(null);
        }}
      />
    );
  }

  if (currentView === 'share' && selectedBotForSharing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentView('list');
                setSelectedBotForSharing(null);
              }}
            >
              ← Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partage et Tracking</h1>
              <p className="text-gray-600">{selectedBotForSharing.name}</p>
            </div>
          </div>
        </div>
        
        <ShortenedLinksManager
          botId={selectedBotForSharing.id}
          botName={selectedBotForSharing.name}
          onViewAnalytics={viewAnalytics}
        />
      </div>
    );
  }

  if (currentView === 'conversations') {
    return (
      <ConversationManager
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Navigation entre les vues */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <BotManagerNav currentView={currentView} onChangeView={setCurrentView} />
          <Button 
            onClick={handleCreateBot}
            disabled={!isAuthenticated || botCount >= maxBots}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            {!isAuthenticated ? 'Connexion requise' : botCount >= maxBots ? 'Limite atteinte' : 'Nouveau Chatbot'}
          </Button>
        </div>

        {/* Affichage des limites pour les utilisateurs authentifiés */}
        {isAuthenticated && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    Plan Gratuit - Utilisation des chatbots
                  </p>
                  <p className="text-blue-700 text-sm">
                    {botCount} / {maxBots} chatbots créés
                  </p>
                </div>
                <div className="text-right">
                  <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.min((botCount / maxBots) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

  const isLimitReached = botCount >= maxBots;

  return (
    <div className="space-y-6">
      {/* Navigation entre les vues */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <BotManagerNav currentView={currentView} onChangeView={setCurrentView} />
        <Button 
          onClick={handleCreateBot}
          disabled={!isAuthenticated || isLimitReached}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" />
          {!isAuthenticated ? 'Connexion requise' : isLimitReached ? 'Limite atteinte' : 'Nouveau Chatbot'}
        </Button>
      </div>

      {/* Affichage des limites pour les utilisateurs authentifiés */}
      {isAuthenticated && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">
                  Plan Gratuit - Utilisation des chatbots
                </p>
                <p className="text-blue-700 text-sm">
                  {botCount} / {maxBots} chatbots créés
                </p>
              </div>
              <div className="text-right">
                <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.min((botCount / maxBots) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message de limite atteinte */}
      {isAuthenticated && isLimitReached && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  Limite de création atteinte
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Vous avez atteint la limite de {maxBots} chatbots pour votre plan gratuit. 
                  Supprimez un chatbot existant ou passez à un plan supérieur pour créer de nouveaux bots.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      {showQrCode && qrCodeUrl && (
        <QRCodeModal
          botName={bots.find(b => b.public_chat_url === showQrCode)?.name || 'bot'}
          qrCodeUrl={qrCodeUrl}
          onDownload={() => downloadQRCode(bots.find(b => b.public_chat_url === showQrCode)?.name || 'bot')}
          onShare={() => shareQRCode(bots.find(b => b.public_chat_url === showQrCode)?.name || 'bot')}
          onClose={() => { setShowQrCode(null); setQrCodeUrl(''); }}
        />
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mes Chatbots</h2>
        <p className="text-gray-600 mb-6">Créez et gérez vos chatbots avec tracking avancé</p>
      </div>

      {!isAuthenticated ? (
        <Card className="p-8 text-center border-amber-200 bg-amber-50">
          <Lock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Authentification requise
          </h3>
          <p className="text-amber-800 mb-4">
            Connectez-vous pour accéder à vos chatbots et en créer jusqu'à 10 gratuitement
          </p>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Se connecter / S'inscrire
          </Button>
        </Card>
      ) : bots.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun chatbot créé
          </h3>
          <p className="text-gray-600 mb-4">
            Créez votre premier chatbot avec tracking avancé des visiteurs
          </p>
          <Button 
            onClick={handleCreateBot}
            disabled={isLimitReached}
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
              <BotCard
                key={bot.id}
                bot={bot}
                stats={stats}
                onTest={testBot}
                onAnalytics={viewAnalytics}
                onDelete={deleteBot}
                onToggleStatus={toggleBotStatus}
                onToggleLiveChat={toggleLiveChatDisplay}
                onCopy={handleCopyToClipboard}
                onShareWhatsApp={shareOnWhatsApp}
                onQRClick={generateQRCode}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
