import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CampaignSend {
  id: string;
  campaign_id: string;
  contact_type: 'email' | 'phone' | 'whatsapp';
  contact_value: string;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'delivered';
  error_message?: string;
  message_id?: string;
  sent_at?: string;
  delivered_at?: string;
  retry_count: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useCampaignSends = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateContactValue = async (sendId: string, newValue: string) => {
    try {
      const { error } = await supabase
        .from('qualification_campaign_sends')
        .update({ contact_value: newValue, updated_at: new Date().toISOString() })
        .eq('id', sendId);

      if (error) throw error;

      toast({
        title: "Contact mis à jour",
        description: "Le contact a été modifié avec succès"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const retrySend = async (send: CampaignSend, campaignData: { message: string; botLink: string }) => {
    try {
      setLoading(true);

      // Mettre à jour le statut à pending
      const { error: updateError } = await supabase
        .from('qualification_campaign_sends')
        .update({
          status: 'pending',
          error_message: null,
          retry_count: send.retry_count + 1
        })
        .eq('id', send.id);

      if (updateError) throw updateError;

      // Préparer le prospect pour l'envoi
      const prospect: any = {
        id: send.id,
        name: send.contact_value
      };

      if (send.contact_type === 'email') {
        prospect.email = send.contact_value;
      } else {
        prospect.phone = send.contact_value;
        prospect.whatsapp = send.contact_value;
      }

      // Appeler l'edge function pour renvoyer
      const { data, error: sendError } = await supabase.functions.invoke('prospect-qualification', {
        body: {
          prospects: [prospect],
          qualificationType: send.channel,
          message: campaignData.message,
          botLink: campaignData.botLink,
          campaignId: send.campaign_id,
          sendId: send.id,
          isRetry: true
        }
      });

      if (sendError) throw sendError;

      toast({
        title: "Envoi relancé",
        description: "Le message est en cours de renvoi"
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateContactValue,
    retrySend
  };
};