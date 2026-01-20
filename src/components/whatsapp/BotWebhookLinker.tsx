import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Link2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBots } from '@/components/bot-conversation/hooks/useBots';

interface BotWebhookLinkerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  onWebhookAdded?: () => void;
}

const BotWebhookLinker: React.FC<BotWebhookLinkerProps> = ({
  open,
  onOpenChange,
  sessionName,
  onWebhookAdded
}) => {
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const { bots, loadingBots } = useBots();

  const linkBotWebhook = async () => {
    if (!selectedBotId || !sessionName) {
      toast.error('Veuillez sélectionner un bot');
      return;
    }

    setLinking(true);

    try {
      const selectedBot = bots.find(bot => bot.id === selectedBotId);
      if (!selectedBot) {
        throw new Error('Bot non trouvé');
      }

      // Récupérer les détails complets du bot pour obtenir son webhook_url
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('webhook_url')
        .eq('id', selectedBot.id)
        .single();

      if (botError) {
        throw new Error('Erreur lors de la récupération des données du bot');
      }

      let webhookUrl = botData?.webhook_url;
      
      // Si pas de webhook_url configuré, utiliser l'URL par défaut
      if (!webhookUrl) {
        webhookUrl = `https://bot.bj/api/webhook/${selectedBot.id}`;
      }

      console.log('Ajout du webhook pour le bot:', selectedBot.name, 'URL:', webhookUrl);

      // Utiliser l'Edge Function proxy pour l'API WAHA (sécurisé)
      const { data, error } = await supabase.functions.invoke('waha-dashboard-proxy', {
        body: {
          path: `/api/sessions/${sessionName}`,
          method: 'GET'
        }
      });

      if (error) {
        throw new Error(`Impossible de récupérer la configuration de la session: ${error.message}`);
      }

      const sessionConfig = data;
      console.log('Configuration actuelle de la session:', sessionConfig);

      // Préparer la nouvelle configuration avec le webhook
      const webhookConfig = {
        url: webhookUrl,
        events: [
          'message',
          'message.reaction',
          'message.status',
          'session.status'
        ],
        hmac: false,
        retries: 3
      };

      // Récupérer les webhooks existants depuis la structure config.webhooks
      const existingWebhooks = (sessionConfig.config && sessionConfig.config.webhooks) ? sessionConfig.config.webhooks : [];
      
      // Préparer la configuration complète selon le format WAHA
      const updatedConfig = {
        name: sessionName,
        config: {
          ...sessionConfig.config,
          webhooks: [...existingWebhooks, webhookConfig]
        }
      };

      console.log('Configuration mise à jour:', updatedConfig);

      // Mettre à jour la session via le proxy sécurisé
      const { data: updateData, error: updateError } = await supabase.functions.invoke('waha-dashboard-proxy', {
        body: {
          path: `/api/sessions/${sessionName}`,
          method: 'PUT',
          body: updatedConfig
        }
      });

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la session:', updateError);
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
      }

      console.log('Session mise à jour avec succès:', updateData);

      toast.success(`Bot "${selectedBot.name}" lié avec succès à la session WhatsApp!`);
      
      onWebhookAdded?.();
      onOpenChange(false);
      setSelectedBotId('');

    } catch (error: any) {
      console.error('Erreur lors du liage du bot:', error);
      toast.error(error.message || 'Erreur lors du liage du bot');
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Lier un bot à WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Session WhatsApp</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="px-3 py-1">
                      {sessionName}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Sélectionner un bot</label>
                  {loadingBots ? (
                    <div className="mt-2 flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Chargement des bots...
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={selectedBotId}
                      onValueChange={setSelectedBotId}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un bot à lier" />
                      </SelectTrigger>
                      <SelectContent>
                        {bots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            <div className="flex items-center gap-2">
                              <span>{bot.name}</span>
                              {bot.is_active && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedBotId && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Webhook sera récupéré depuis:</strong> Configuration du bot
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={linking}
            >
              Annuler
            </Button>
            <Button
              onClick={linkBotWebhook}
              disabled={!selectedBotId || linking || loadingBots}
            >
              {linking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Liaison en cours...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Lier le bot
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotWebhookLinker;
