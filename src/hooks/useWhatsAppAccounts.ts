import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppAccount {
  id: string;
  session_name: string;
  phone_number?: string;
  status: string;
  qr_code?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
}

export interface Bot {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface BotLink {
  id: string;
  whatsapp_account_id: string;
  bot_id: string;
  is_active: boolean;
  auto_response_enabled: boolean;
  welcome_message: string;
  response_delay_seconds: number;
  created_at: string;
  updated_at: string;
  bots: Bot;
}

export const useWhatsAppAccounts = () => {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [botLinks, setBotLinks] = useState<BotLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Failed to load WhatsApp accounts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les comptes WhatsApp",
        variant: "destructive",
      });
    }
  };

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBots(data || []);
    } catch (error: any) {
      console.error('Failed to load bots:', error);
    }
  };

  const loadBotLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_bot_links')
        .select(`
          *,
          bots (id, name, description, is_active)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBotLinks(data || []);
    } catch (error: any) {
      console.error('Failed to load bot links:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAccounts(), loadBots(), loadBotLinks()]);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionName: string, phoneNumber?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'create',
          sessionName,
          phoneNumber,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session créée",
          description: `Session ${sessionName} créée avec succès`,
        });
        await loadAccounts();
        return data;
      } else {
        throw new Error(data.error || 'Failed to create session');
      }
    } catch (error: any) {
      console.error('Failed to create session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session",
        variant: "destructive",
      });
      throw error;
    }
  };

  const startSession = async (sessionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'start',
          sessionName,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session démarrée",
          description: "Veuillez scanner le code QR pour connecter WhatsApp",
        });
        await loadAccounts();
        return data;
      } else {
        throw new Error(data.error || 'Failed to start session');
      }
    } catch (error: any) {
      console.error('Failed to start session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de démarrer la session",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getQRCode = async (sessionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'qr',
          sessionName,
        },
      });

      if (error) throw error;

      if (data.success && data.qrCode) {
        return data.qrCode;
      } else {
        throw new Error(data.error || 'Failed to get QR code');
      }
    } catch (error: any) {
      console.error('Failed to get QR code:', error);
      throw error;
    }
  };

  const stopSession = async (sessionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'stop',
          sessionName,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session arrêtée",
          description: `Session ${sessionName} arrêtée`,
        });
        await loadAccounts();
        return data;
      } else {
        throw new Error(data.error || 'Failed to stop session');
      }
    } catch (error: any) {
      console.error('Failed to stop session:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'arrêter la session",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSession = async (sessionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'delete',
          sessionName,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session supprimée",
          description: `Session ${sessionName} supprimée`,
        });
        await loadAccounts();
        return data;
      } else {
        throw new Error(data.error || 'Failed to delete session');
      }
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la session",
        variant: "destructive",
      });
      throw error;
    }
  };

  const linkBot = async (whatsappAccountId: string, botId: string, welcomeMessage?: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_links')
        .insert({
          whatsapp_account_id: whatsappAccountId,
          bot_id: botId,
          is_active: true,
          auto_response_enabled: true,
          welcome_message: welcomeMessage || 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider?',
        });

      if (error) throw error;

      toast({
        title: "Bot lié",
        description: "Le bot a été lié avec succès à ce compte WhatsApp",
      });
      await loadBotLinks();
    } catch (error: any) {
      console.error('Failed to link bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de lier le bot",
        variant: "destructive",
      });
      throw error;
    }
  };

  const unlinkBot = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Bot délié",
        description: "Le bot a été délié avec succès",
      });
      await loadBotLinks();
    } catch (error: any) {
      console.error('Failed to unlink bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de délier le bot",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateBotLink = async (linkId: string, updates: Partial<BotLink>) => {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_links')
        .update(updates)
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Configuration mise à jour",
        description: "Les paramètres du bot ont été mis à jour",
      });
      await loadBotLinks();
    } catch (error: any) {
      console.error('Failed to update bot link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendMessage = async (sessionName: string, to: string, message: string, messageType: 'text' | 'image' | 'file' = 'text', mediaUrl?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('waha-send-message', {
        body: {
          sessionName,
          to,
          message,
          messageType,
          mediaUrl,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Message envoyé",
          description: "Le message a été envoyé avec succès",
        });
        return data;
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    loadData();

    // Set up realtime subscriptions
    const accountsSubscription = supabase
      .channel('whatsapp_accounts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_accounts'
      }, () => {
        loadAccounts();
      })
      .subscribe();

    const botLinksSubscription = supabase
      .channel('whatsapp_bot_links_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_bot_links'
      }, () => {
        loadBotLinks();
      })
      .subscribe();

    return () => {
      accountsSubscription.unsubscribe();
      botLinksSubscription.unsubscribe();
    };
  }, []);

  return {
    accounts,
    bots,
    botLinks,
    loading,
    loadData,
    createSession,
    startSession,
    getQRCode,
    stopSession,
    deleteSession,
    linkBot,
    unlinkBot,
    updateBotLink,
    sendMessage,
  };
};