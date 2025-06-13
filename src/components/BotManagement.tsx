import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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
  Download
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
      description: "Votre chatbot a été créé avec tracking avancé des visiteurs et connectivité N8N",
    });
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

      // Vérifier que le bot est actif
      if (!bot.is_active) {
        toast({
          title: "Bot inactif",
          description: `Le bot "${bot.name}" est actuellement désactivé. Activez-le pour pouvoir le tester.`,
          variant: "destructive",
        });
        return;
      }

      // Vérifier que le webhook URL existe
      if (!bot.webhook_url || bot.webhook_url.trim() === '') {
        toast({
          title: "Configuration manquante",
          description: `Le bot "${bot.name}" n'a pas de webhook URL configuré.`,
          variant: "destructive",
        });
        return;
      }

      // Initialiser le tracking du visiteur pour ce test
      await initializeVisitorTracking(bot.id, 'bot_test');
      
      // Construire l'URL avec tous les paramètres spécifiques du bot
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

      // Ouvrir le chat dans une nouvelle fenêtre
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
    if (!bot.public_chat_url) {
      toast({
        title: "Erreur",
        description: "Ce bot n'a pas de lien public configuré",
        variant: "destructive",
      });
      return;
    }

    // Message personnalisé pour WhatsApp avec le lien direct du bot
    const directChatUrl = `https://ia.bot.bj/chat?bot=${bot.id}&entry=whatsapp_share`;
    const customMessage = `🤖 Découvrez ${bot.name} - votre assistant IA intelligent disponible 24/7 ! 

💬 Cliquez ici pour démarrer la conversation : ${directChatUrl}

✨ Assistance instantanée et personnalisée`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(customMessage)}`;
    
    // Ouvrir WhatsApp avec le message pré-rempli
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: `Partage WhatsApp - ${bot.name}`,
      description: "WhatsApp s'ouvre avec le lien direct du chat et un message personnalisé",
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
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQrCodeUrl(qrCodeDataUrl);
      setShowQrCode(url);
      
      toast({
        title: "QR Code généré",
        description: `QR Code créé pour ${botName}`,
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
        <div className="flex items-center justify-between">
          {renderNavigation()}
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
        {renderNavigation()}
        <Button 
          onClick={() => setCurrentView('create')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Chatbot
        </Button>
      </div>

      {/* QR Code Modal */}
      {showQrCode && qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">QR Code du Chatbot</h3>
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
              <p className="text-sm text-gray-600">
                Scannez ce QR Code pour accéder directement au chat
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => downloadQRCode(bots.find(bot => bot.public_chat_url === showQrCode)?.name || 'bot')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
                <Button
                  onClick={() => shareQRCode(bots.find(bot => bot.public_chat_url === showQrCode)?.name || 'bot')}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <FaWhatsapp className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
              <Button
                onClick={() => {
                  setShowQrCode(null);
                  setQrCodeUrl('');
                }}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Vue liste des bots */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mes Chatbots</h2>
        <p className="text-gray-600 mb-6">Créez et gérez vos chatbots avec tracking avancé et connectivité N8N</p>
      </div>

      {/* Liste des chatbots */}
      {bots.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun chatbot créé
          </h3>
          <p className="text-gray-600 mb-4">
            Créez votre premier chatbot avec tracking avancé des visiteurs et connectivité N8N
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
                  <div className="text-xs text-green-600 mt-1">✅ N8N connecté</div>
                  <div className="text-xs text-blue-600">🔗 Webhook: {bot.webhook_url}</div>
                  <div className="text-xs text-purple-600 mt-1">📊 Tracking visiteurs activé</div>
                </div>

                {/* URL publique et partage */}
                {bot.share_enabled && bot.public_chat_url && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700">Lien public</span>
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => shareOnWhatsApp(bot)}
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6 bg-green-500 hover:bg-green-600 text-white rounded"
                          title="Partager sur WhatsApp avec message personnalisé"
                        >
                          <FaWhatsapp className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => generateQRCode(bot.public_chat_url, bot.name)}
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6 bg-purple-500 hover:bg-purple-600 text-white rounded"
                          title="Générer QR Code"
                        >
                          <QrCode className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => handleCopyToClipboard(bot.public_chat_url, 'Lien public')}
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
                    Chat
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
