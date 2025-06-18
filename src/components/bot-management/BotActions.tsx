
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { initializeVisitorTracking } from '@/utils/visitorTracking';
import { copyToClipboard } from '@/lib/utils';
import { cleanPublicUrl } from '../botManagementUtils';
import QRCode from 'qrcode';
import { FaWhatsapp } from 'react-icons/fa';

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
  display_in_live_chat: boolean;
  created_at: string;
  updated_at: string;
}

export const useBotActions = () => {
  const { toast } = useToast();

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

  const shareOnWhatsApp = (bot: Bot) => {
    let shareUrl = bot.public_chat_url;
    
    if (!shareUrl) {
      shareUrl = `https://bot.bj/bot/${bot.id}`;
    }
    
    shareUrl = shareUrl.replace(/https:\/\/ia\.bot\.bj/g, 'https://bot.bj');
    
    console.log('=== PARTAGE WHATSAPP ===');
    console.log('Bot:', bot.name);
    console.log('Lien public original:', bot.public_chat_url);
    console.log('Lien nettoyé pour partage:', shareUrl);

    const customMessage = `🤖 Découvrez ${bot.name} - votre assistant IA intelligent disponible 24/7 ! 

💬 Cliquez ici pour démarrer la conversation : ${shareUrl}

✨ Assistance instantanée et personnalisée - Aucune inscription requise !`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(customMessage)}`;
    
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
      const cleanUrl = url.replace(/https:\/\/ia\.bot\.bj/g, 'https://bot.bj');
      
      const qrCodeDataUrl = await QRCode.toDataURL(cleanUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      toast({
        title: "QR Code généré",
        description: `QR Code créé pour ${botName} avec lien nettoyé`,
      });

      return { qrCodeDataUrl, cleanUrl };
    } catch (error) {
      console.error('Erreur lors de la génération du QR Code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le QR Code",
        variant: "destructive",
      });
      return null;
    }
  };

  const toggleBotStatus = async (bot: Bot, onSuccess: () => void) => {
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

      onSuccess();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le statut du bot",
        variant: "destructive",
      });
    }
  };

  const deleteBot = async (botId: string, onSuccess: () => void) => {
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

      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le chatbot",
        variant: "destructive",
      });
    }
  };

  const toggleLiveChatDisplay = async (bot: Bot, onSuccess: () => void) => {
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

      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut live chat:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'affichage du bot dans le chat live",
        variant: "destructive",
      });
    }
  };

  return {
    testBot,
    shareOnWhatsApp,
    handleCopyToClipboard,
    generateQRCode,
    toggleBotStatus,
    deleteBot,
    toggleLiveChatDisplay
  };
};
