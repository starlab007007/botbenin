import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppMessage {
  id: string;
  whatsapp_account_id: string;
  bot_link_id?: string;
  message_id: string;
  from_number: string;
  to_number: string;
  message_type: string;
  content?: string;
  media_url?: string;
  is_from_me: boolean;
  is_bot_response: boolean;
  timestamp: string;
  waha_raw_data?: any;
  created_at: string;
}

export interface MessageContact {
  phone_number: string;
  display_name?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export const useWhatsAppMessages = (accountId?: string) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMessages = async () => {
    if (!accountId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('whatsapp_account_id', accountId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!accountId) {
      setContacts([]);
      return;
    }

    try {
      // Get unique contacts from messages
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('from_number, to_number, content, timestamp, is_from_me')
        .eq('whatsapp_account_id', accountId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group messages by contact
      const contactsMap = new Map<string, MessageContact>();

      data?.forEach((message) => {
        const contactNumber = message.is_from_me ? message.to_number : message.from_number;
        
        if (!contactsMap.has(contactNumber)) {
          contactsMap.set(contactNumber, {
            phone_number: contactNumber,
            display_name: contactNumber.replace('@c.us', ''),
            last_message: message.content || '[Média]',
            last_message_time: message.timestamp,
            unread_count: message.is_from_me ? 0 : 1,
          });
        } else {
          const contact = contactsMap.get(contactNumber)!;
          if (!message.is_from_me && message.timestamp > (contact.last_message_time || '')) {
            contact.unread_count = (contact.unread_count || 0) + 1;
          }
        }
      });

      setContacts(Array.from(contactsMap.values()));
    } catch (error: any) {
      console.error('Failed to load contacts:', error);
    }
  };

  const getMessagesForContact = async (contactNumber: string) => {
    if (!accountId) return [];

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('whatsapp_account_id', accountId)
        .or(`from_number.eq.${contactNumber},to_number.eq.${contactNumber}`)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to load contact messages:', error);
      return [];
    }
  };

  const markMessagesAsRead = async (contactNumber: string) => {
    try {
      // In a real implementation, you might want to track read status
      // For now, we'll just update the local contacts state
      setContacts(prev => 
        prev.map(contact => 
          contact.phone_number === contactNumber 
            ? { ...contact, unread_count: 0 }
            : contact
        )
      );
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès",
      });
      
      await loadMessages();
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  const searchMessages = async (query: string) => {
    if (!accountId || !query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('whatsapp_account_id', accountId)
        .ilike('content', `%${query}%`)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to search messages:', error);
      return [];
    }
  };

  const getMessageStats = () => {
    const totalMessages = messages.length;
    const incomingMessages = messages.filter(m => !m.is_from_me).length;
    const outgoingMessages = messages.filter(m => m.is_from_me).length;
    const botResponses = messages.filter(m => m.is_bot_response).length;
    const uniqueContacts = new Set(
      messages.map(m => m.is_from_me ? m.to_number : m.from_number)
    ).size;

    return {
      totalMessages,
      incomingMessages,
      outgoingMessages,
      botResponses,
      uniqueContacts,
    };
  };

  useEffect(() => {
    if (accountId) {
      loadMessages();
      loadContacts();

      // Set up realtime subscription for messages
      const subscription = supabase
        .channel(`whatsapp_messages_${accountId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `whatsapp_account_id=eq.${accountId}`
        }, () => {
          loadMessages();
          loadContacts();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Reset states when no account is selected
      setMessages([]);
      setContacts([]);
      setLoading(false);
    }
  }, [accountId]);

  return {
    messages,
    contacts,
    loading,
    loadMessages,
    loadContacts,
    getMessagesForContact,
    markMessagesAsRead,
    deleteMessage,
    searchMessages,
    getMessageStats,
  };
};