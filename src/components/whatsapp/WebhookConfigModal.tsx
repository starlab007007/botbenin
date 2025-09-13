import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Webhook, Settings, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';

interface WebhookConfig {
  url: string;
  events: string[];
  hmac: boolean;
  retries: number;
}

interface WebhookConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
}

const AVAILABLE_EVENTS = [
  { id: 'message', label: 'Messages', description: 'Tous les messages reçus/envoyés' },
  { id: 'message.reaction', label: 'Réactions', description: 'Réactions aux messages' },
  { id: 'message.status', label: 'Statuts', description: 'Statuts de livraison des messages' },
  { id: 'session.status', label: 'Session', description: 'Changements de statut de session' },
  { id: 'call', label: 'Appels', description: 'Appels WhatsApp' },
  { id: 'presence', label: 'Présence', description: 'Statut en ligne/hors ligne' }
];

const PRESET_WEBHOOKS = [
  { 
    name: 'n8n (Make.com)', 
    url: 'https://hook.eu2.make.com/jarvis-conversation-webhook',
    events: ['message', 'session.status']
  },
  { 
    name: 'Zapier', 
    url: 'https://hooks.zapier.com/hooks/catch/',
    events: ['message', 'message.status']
  },
  { 
    name: 'Bot.bj Webhook', 
    url: 'https://ia.bot.bj/webhook/pointage-qr',
    events: ['message', 'session.status']
  }
];

const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  open,
  onOpenChange,
  sessionName
}) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [currentWebhook, setCurrentWebhook] = useState<WebhookConfig>({
    url: '',
    events: ['message', 'session.status'],
    hmac: false,
    retries: 3
  });
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const { makeWAHARequest } = useWAHADashboard() as any;

  // Charger la configuration actuelle des webhooks
  const loadWebhookConfig = async () => {
    if (!sessionName) return;
    
    setConfigLoading(true);
    try {
      // Utiliser l'authentification Basic + API Key comme spécifié par WAHA
      const basicAuth = btoa('admin:Starlab2007'); // Encoder en base64
      
      const sessionConfig = await fetch(`https://waha.bot.bj/api/sessions/${sessionName}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        }
      });

      if (sessionConfig.ok) {
        const config = await sessionConfig.json();
        // La structure WAHA contient les webhooks dans config.webhooks
        if (config.config && config.config.webhooks && Array.isArray(config.config.webhooks)) {
          setWebhooks(config.config.webhooks);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  // Ajouter un webhook
  const addWebhook = async () => {
    if (!currentWebhook.url.trim()) {
      toast.error('Veuillez entrer une URL de webhook');
      return;
    }

    if (currentWebhook.events.length === 0) {
      toast.error('Veuillez sélectionner au moins un événement');
      return;
    }

    setLoading(true);
    try {
      // Authentification Basic + API Key comme requis par WAHA
      const basicAuth = btoa('admin:Starlab2007');
      
      // Récupérer la configuration actuelle complète
      const sessionResponse = await fetch(`https://waha.bot.bj/api/sessions/${sessionName}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        }
      });

      if (!sessionResponse.ok) {
        throw new Error('Impossible de récupérer la configuration de la session');
      }

      const sessionConfig = await sessionResponse.json();
      console.log('Configuration actuelle récupérée:', sessionConfig);
      
      // Récupérer les webhooks existants depuis la structure config.webhooks
      const existingWebhooks = (sessionConfig.config && sessionConfig.config.webhooks) ? sessionConfig.config.webhooks : [];
      
      // Ajouter le nouveau webhook
      const newWebhooks = [...existingWebhooks, currentWebhook];

      // Préparer la nouvelle configuration complète selon le format WAHA
      const updatedConfig = {
        name: sessionName,
        config: {
          ...sessionConfig.config,
          webhooks: newWebhooks
        }
      };

      console.log('Configuration mise à jour à envoyer:', updatedConfig);

      // Mettre à jour la session avec PUT comme requis par l'API WAHA
      const updateResponse = await fetch(`https://waha.bot.bj/api/sessions/${sessionName}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Erreur de mise à jour:', errorText);
        throw new Error(`Erreur lors de la mise à jour: ${updateResponse.status} - ${errorText}`);
      }

      const result = await updateResponse.json();
      console.log('Webhook ajouté avec succès:', result);
      
      toast.success('Webhook ajouté avec succès!');
      
      // Réinitialiser le formulaire
      setCurrentWebhook({
        url: '',
        events: ['message', 'session.status'],
        hmac: false,
        retries: 3
      });

      // Recharger la configuration
      await loadWebhookConfig();
      
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du webhook:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du webhook');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un webhook
  const removeWebhook = async (index: number) => {
    setLoading(true);
    try {
      const basicAuth = btoa('admin:Starlab2007');
      
      const sessionResponse = await fetch(`https://waha.bot.bj/api/sessions/${sessionName}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        }
      });

      if (!sessionResponse.ok) {
        throw new Error('Impossible de récupérer la configuration de la session');
      }

      const sessionConfig = await sessionResponse.json();
      const newWebhooks = [...webhooks];
      newWebhooks.splice(index, 1);

      // Préparer la configuration complète selon le format WAHA
      const updatedConfig = {
        name: sessionName,
        config: {
          ...sessionConfig.config,
          webhooks: newWebhooks
        }
      };

      const updateResponse = await fetch(`https://waha.bot.bj/api/sessions/${sessionName}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!updateResponse.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast.success('Webhook supprimé!');
      await loadWebhookConfig();
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // Utiliser un preset
  const usePreset = (preset: typeof PRESET_WEBHOOKS[0]) => {
    setCurrentWebhook({
      ...currentWebhook,
      url: preset.url,
      events: preset.events
    });
  };

  useEffect(() => {
    if (open && sessionName) {
      loadWebhookConfig();
    }
  }, [open, sessionName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Configuration Webhooks - {sessionName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Webhooks existants */}
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Chargement de la configuration...</span>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Webhooks actifs ({webhooks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Aucun webhook configuré
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((webhook, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-sm break-all">{webhook.url}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {webhook.events.map(event => (
                                <Badge key={event} variant="secondary" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tentatives: {webhook.retries} | HMAC: {webhook.hmac ? 'Activé' : 'Désactivé'}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeWebhook(index)}
                            disabled={loading}
                            className="ml-2 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Presets rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Presets rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {PRESET_WEBHOOKS.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => usePreset(preset)}
                    className="justify-start h-auto p-3"
                  >
                    <div className="text-left">
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground break-all">
                        {preset.url}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ajouter un nouveau webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">URL du Webhook</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://votre-webhook.com/endpoint"
                  value={currentWebhook.url}
                  onChange={(e) => setCurrentWebhook({ ...currentWebhook, url: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Événements à écouter</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={event.id}
                        checked={currentWebhook.events.includes(event.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCurrentWebhook({
                              ...currentWebhook,
                              events: [...currentWebhook.events, event.id]
                            });
                          } else {
                            setCurrentWebhook({
                              ...currentWebhook,
                              events: currentWebhook.events.filter(e => e !== event.id)
                            });
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={event.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {event.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="retries">Nombre de tentatives</Label>
                  <Input
                    id="retries"
                    type="number"
                    min="1"
                    max="10"
                    value={currentWebhook.retries}
                    onChange={(e) => setCurrentWebhook({ 
                      ...currentWebhook, 
                      retries: parseInt(e.target.value) || 3 
                    })}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="hmac"
                    checked={currentWebhook.hmac}
                    onCheckedChange={(checked) => setCurrentWebhook({ 
                      ...currentWebhook, 
                      hmac: !!checked 
                    })}
                  />
                  <Label htmlFor="hmac" className="text-sm">
                    Activer HMAC
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Fermer
            </Button>
            <Button
              onClick={addWebhook}
              disabled={loading || !currentWebhook.url.trim() || currentWebhook.events.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Ajout...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Webhook
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebhookConfigModal;