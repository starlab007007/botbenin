
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotAutomationCreator } from '@/components/automation/BotAutomationCreator';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { ShortenedLinksManager } from '@/components/ShortenedLinksManager';
import { ConversationManager } from '@/components/ConversationManager';
import { Plus, Home, Mail } from 'lucide-react';
import { BotManagerNav } from "./BotManagerNav";
import { QRCodeModal } from "./QRCodeModal";
import { useAuth } from '@/contexts/AuthContext';

// Import new components
import { AuthGuard } from './bot-management/AuthGuard';
import { BotLimitDisplay } from './bot-management/BotLimitDisplay';
import { BotList } from './bot-management/BotList';
import { useBotStats } from './bot-management/BotStats';
import { useBotActions } from './bot-management/BotActions';

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

type ViewType = 'dashboard' | 'list' | 'create' | 'analytics' | 'share' | 'conversations';

export const BotManagement: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedBotForAnalytics, setSelectedBotForAnalytics] = useState<{ id: string; name: string } | null>(null);
  const [selectedBotForSharing, setSelectedBotForSharing] = useState<{ id: string; name: string } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState<string | null>(null);
  const [botCount, setBotCount] = useState(0);
  const [maxBots, setMaxBots] = useState(10); // Fixed to 10 for free plan
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Use our new hooks
  const { botStats, fetchBotsStatsFromView } = useBotStats();
  const {
    testBot,
    shareOnWhatsApp,
    handleCopyToClipboard,
    generateQRCode,
    toggleBotStatus,
    deleteBot,
    toggleLiveChatDisplay
  } = useBotActions();

  useEffect(() => {
    // Auth is now guaranteed by ProtectedRoute wrapper
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le bot_owner avec gestion automatique de création
      let { data: ownerData, error: ownerError } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!ownerData) {
        // Créer automatiquement le bot_owner si il n'existe pas
        const { data: newOwner, error: createError } = await supabase
          .from('bot_owners')
          .insert({ 
            user_id: user.id,
            subscription_plan: 'free',
            max_bots: 10
          })
          .select('id, max_bots')
          .single();
        
        if (createError) {
          console.error('Erreur création bot_owner:', createError);
          // En cas d'erreur de création (conflit), essayer de récupérer l'existant
          const { data: existingOwner } = await supabase
            .from('bot_owners')
            .select('id, max_bots')
            .eq('user_id', user.id)
            .single();
          
          ownerData = existingOwner;
        } else {
          ownerData = newOwner;
        }
      }

      if (!ownerData) {
        throw new Error('Impossible de configurer votre compte propriétaire de bots');
      }

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
      // Always set maxBots to 10 for free plan
      setMaxBots(10);

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
    // Auth check removed - handled by ProtectedRoute
    if (botCount >= 10) { // Fixed limit check to 10
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint la limite de 10 chatbots pour votre plan gratuit",
        variant: "destructive",
      });
      return;
    }

    setCurrentView('create');
  };

  const handleQRClick = async (url: string, botName: string) => {
    const result = await generateQRCode(url, botName);
    if (result) {
      setQrCodeUrl(result.qrCodeDataUrl);
      setShowQrCode(result.cleanUrl);
    }
  };

  const shareQRCode = async (botName: string) => {
    if (!qrCodeUrl) return;
    
    try {
      const customMessage = `🔗 Scannez ce QR Code pour accéder directement à ${botName} - votre assistant IA intelligent disponible 24/7 !`;
      
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

  const viewAnalytics = (botId: string, botName: string) => {
    setSelectedBotForAnalytics({ id: botId, name: botName });
    setCurrentView('analytics');
  };

  const viewSharing = (botId: string, botName: string) => {
    setSelectedBotForSharing({ id: botId, name: botName });
    setCurrentView('share');
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
            disabled={!isAuthenticated || botCount >= 10}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            {!isAuthenticated ? 'Connexion requise' : botCount >= 10 ? 'Limite atteinte' : 'Nouveau Chatbot'}
          </Button>
        </div>

        <BotLimitDisplay 
          botCount={botCount} 
          maxBots={10}
          isAuthenticated={isAuthenticated} 
        />

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

  const isLimitReached = botCount >= 10; // Fixed limit check to 10

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

      <BotLimitDisplay 
        botCount={botCount} 
        maxBots={10}
        isAuthenticated={isAuthenticated} 
      />

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

      <AuthGuard isAuthenticated={isAuthenticated}>
        <BotList
          bots={bots}
          botStats={botStats}
          isAuthenticated={isAuthenticated}
          isLimitReached={isLimitReached}
          onCreateBot={handleCreateBot}
          onTest={testBot}
          onAnalytics={viewAnalytics}
          onDelete={(botId) => deleteBot(botId, fetchBots)}
          onToggleStatus={(bot) => toggleBotStatus(bot, fetchBots)}
          onToggleLiveChat={(bot) => toggleLiveChatDisplay(bot, fetchBots)}
          onCopy={handleCopyToClipboard}
          onShareWhatsApp={shareOnWhatsApp}
          onQRClick={handleQRClick}
        />
      </AuthGuard>
    </div>
  );
};
