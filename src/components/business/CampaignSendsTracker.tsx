import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCampaignSends, type CampaignSend } from '@/hooks/useCampaignSends';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  Edit2,
  Mail,
  MessageSquare,
  Smartphone 
} from 'lucide-react';

interface CampaignSendsTrackerProps {
  campaignId: string;
  campaignMessage: string;
  campaignBotLink: string;
}

export const CampaignSendsTracker: React.FC<CampaignSendsTrackerProps> = ({ 
  campaignId,
  campaignMessage,
  campaignBotLink 
}) => {
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { updateContactValue, retrySend } = useCampaignSends();
  const { toast } = useToast();

  const loadSends = async () => {
    try {
      const { data, error } = await supabase
        .from('qualification_campaign_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSends((data || []) as CampaignSend[]);
    } catch (error: any) {
      console.error('Erreur chargement envois:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les envois",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSends();

    // Subscription en temps réel
    const channel = supabase
      .channel(`campaign_sends_changes_${campaignId}_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qualification_campaign_sends',
          filter: `campaign_id=eq.${campaignId}`
        },
        () => {
          loadSends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'sending':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      sending: 'secondary',
      pending: 'secondary'
    };
    return variants[status] || 'secondary';
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'sms':
        return <Smartphone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleEdit = (send: CampaignSend) => {
    setEditingId(send.id);
    setEditValue(send.contact_value);
  };

  const handleSaveEdit = async (sendId: string) => {
    try {
      await updateContactValue(sendId, editValue);
      setEditingId(null);
      loadSends();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRetry = async (send: CampaignSend) => {
    try {
      await retrySend(send, {
        message: campaignMessage,
        botLink: campaignBotLink
      });
      loadSends();
    } catch (error) {
      // Error handled in hook
    }
  };

  const statusCounts = sends.reduce((acc, send) => {
    acc[send.status] = (acc[send.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="text-center py-4">Chargement des envois...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Suivi des Envois</span>
          <Button variant="outline" size="sm" onClick={loadSends}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{sends.length}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600">Envoyés</div>
            <div className="text-2xl font-bold text-green-600">
              {(statusCounts.sent || 0) + (statusCounts.delivered || 0)}
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-sm text-red-600">Échecs</div>
            <div className="text-2xl font-bold text-red-600">{statusCounts.failed || 0}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600">En cours</div>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.sending || 0}</div>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="text-sm text-gray-600">En attente</div>
            <div className="text-2xl font-bold text-gray-600">{statusCounts.pending || 0}</div>
          </div>
        </div>

        {/* Liste des envois */}
        <div className="space-y-2">
          {sends.map((send) => (
            <div
              key={send.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3 flex-1">
                {getChannelIcon(send.channel)}
                <div className="flex-1">
                  {editingId === send.id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button size="sm" onClick={() => handleSaveEdit(send.id)}>
                        Enregistrer
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingId(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{send.contact_value}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(send)}
                        disabled={send.status === 'sending'}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {send.error_message && (
                    <p className="text-xs text-red-600 mt-1">{send.error_message}</p>
                  )}
                  {send.retry_count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tentatives: {send.retry_count}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(send.status)}
                  <Badge variant={getStatusBadge(send.status)}>
                    {send.status}
                  </Badge>
                </div>
                {send.status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetry(send)}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Renvoyer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {sends.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun envoi pour cette campagne
          </div>
        )}
      </CardContent>
    </Card>
  );
};