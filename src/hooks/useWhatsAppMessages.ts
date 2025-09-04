import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppMessage {
  id: string;
  session_name: string;
  from: string;
  to: string;
  message: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document';
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  metadata: any;
  media_url?: string;
  reply_to_message_id?: string;
}

export interface WhatsAppContact {
  id: string;
  session_name: string;
  phone_number: string;
  name?: string;
  profile_picture?: string;
  last_seen: string;
  is_contact: boolean;
  is_blocked: boolean;
  metadata: any;
  message_count: number;
  last_message: string;
  last_message_timestamp: string;
}

export const useWhatsAppMessages = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for now since tables aren't created yet
  const mockMessages: WhatsAppMessage[] = [
    {
      id: '1',
      session_name: 'user_session_1',
      from: '+237123456789',
      to: 'bot',
      message: 'Bonjour, comment allez-vous?',
      message_type: 'text',
      direction: 'incoming',
      status: 'read',
      timestamp: new Date().toISOString(),
      metadata: {}
    },
    {
      id: '2', 
      session_name: 'user_session_1',
      from: 'bot',
      to: '+237123456789',
      message: 'Bonjour! Je vais bien, merci. Comment puis-je vous aider?',
      message_type: 'text',
      direction: 'outgoing',
      status: 'delivered',
      timestamp: new Date().toISOString(),
      metadata: {}
    }
  ];

  const mockContacts: WhatsAppContact[] = [
    {
      id: '1',
      session_name: 'user_session_1',
      phone_number: '+237123456789',
      name: 'Client Test',
      last_seen: new Date().toISOString(),
      is_contact: true,
      is_blocked: false,
      metadata: {},
      message_count: 15,
      last_message: 'Bonjour, comment allez-vous?',
      last_message_timestamp: new Date().toISOString()
    },
    {
      id: '2',
      session_name: 'user_session_1', 
      phone_number: '+237987654321',
      name: 'Prospect Commercial',
      last_seen: new Date().toISOString(),
      is_contact: false,
      is_blocked: false,
      metadata: {},
      message_count: 8,
      last_message: 'Merci pour les informations',
      last_message_timestamp: new Date().toISOString()
    }
  ];

  const loadMessages = async (sessionName?: string, limit: number = 50) => {
    try {
      // For now, use mock data
      // Later when tables are ready: 
      // let query = supabase.from('whatsapp_messages').select('*')
      setMessages(mockMessages);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    }
  };

  const loadContacts = async (sessionName?: string) => {
    try {
      // For now, use mock data
      // Later when tables are ready:
      // let query = supabase.from('whatsapp_contacts').select('*')
      setContacts(mockContacts);
    } catch (error: any) {
      console.error('Failed to load contacts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les contacts",
        variant: "destructive",
      });
    }
  };

  const loadData = async (sessionName?: string) => {
    setLoading(true);
    try {
      await Promise.all([
        loadMessages(sessionName),
        loadContacts(sessionName)
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('AUTH_REQUIRED');
    }
    return { Authorization: `Bearer ${session.access_token}` } as Record<string, string>;
  };

  const sendMessage = async (
    sessionName: string, 
    to: string, 
    message: string, 
    messageType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text',
    mediaUrl?: string,
    replyToMessageId?: string
  ) => {
    setMessageLoading(true);
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('waha-send-message', {
        body: {
          sessionName,
          to,
          message,
          messageType,
          mediaUrl,
          replyToMessageId,
        },
        headers,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Message envoyé",
          description: "Le message a été envoyé avec succès",
        });
        
        // Add to mock messages for now
        const newMessage: WhatsAppMessage = {
          id: Date.now().toString(),
          session_name: sessionName,
          from: 'bot',
          to,
          message,
          message_type: messageType,
          direction: 'outgoing',
          status: 'sent',
          timestamp: new Date().toISOString(),
          metadata: {},
          media_url: mediaUrl,
          reply_to_message_id: replyToMessageId
        };
        setMessages(prev => [newMessage, ...prev]);
        return data;
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        title: "Erreur d'envoi",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      });
      throw error;
    } finally {
      setMessageLoading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      // Update local state for now
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Remove from local state for now
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé",
      });
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
      throw error;
    }
  };

  const blockContact = async (sessionName: string, phoneNumber: string) => {
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('waha-manage-contact', {
        body: {
          sessionName,
          phoneNumber,
          action: 'block'
        },
        headers,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Contact bloqué",
          description: "Le contact a été bloqué",
        });
        await loadContacts(sessionName);
        return data;
      } else {
        throw new Error(data.error || 'Failed to block contact');
      }
    } catch (error: any) {
      console.error('Failed to block contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de bloquer le contact",
        variant: "destructive",
      });
      throw error;
    }
  };

  const unblockContact = async (sessionName: string, phoneNumber: string) => {
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('waha-manage-contact', {
        body: {
          sessionName,
          phoneNumber,
          action: 'unblock'
        },
        headers,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Contact débloqué",
          description: "Le contact a été débloqué",
        });
        await loadContacts(sessionName);
        return data;
      } else {
        throw new Error(data.error || 'Failed to unblock contact');
      }
    } catch (error: any) {
      console.error('Failed to unblock contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de débloquer le contact",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getMessageHistory = async (sessionName: string, phoneNumber: string, limit: number = 50) => {
    try {
      // Filter mock messages for now
      return mockMessages.filter(msg => 
        msg.session_name === sessionName && 
        (msg.from === phoneNumber || msg.to === phoneNumber)
      ).slice(0, limit);
    } catch (error: any) {
      console.error('Failed to get message history:', error);
      return [];
    }
  };

  const getMessageStats = async (sessionName?: string) => {
    try {
      const filteredMessages = sessionName 
        ? mockMessages.filter(msg => msg.session_name === sessionName)
        : mockMessages;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total: filteredMessages.length,
        today: filteredMessages.filter(msg => new Date(msg.timestamp) >= today).length,
        incoming: filteredMessages.filter(msg => msg.direction === 'incoming').length,
        outgoing: filteredMessages.filter(msg => msg.direction === 'outgoing').length,
        delivered: filteredMessages.filter(msg => msg.status === 'delivered').length,
        read: filteredMessages.filter(msg => msg.status === 'read').length,
      };

      return stats;
    } catch (error: any) {
      console.error('Failed to get message stats:', error);
      return {
        total: 0,
        today: 0,
        incoming: 0,
        outgoing: 0,
        delivered: 0,
        read: 0,
      };
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    messages,
    contacts,
    loading,
    messageLoading,
    loadData,
    loadMessages,
    loadContacts,
    sendMessage,
    markMessageAsRead,
    deleteMessage,
    blockContact,
    unblockContact,
    getMessageHistory,
    getMessageStats,
  };
};