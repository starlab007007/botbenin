import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Webhook, Settings, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';

interface WebhookConfig {
  url: string;
  events: string[];
}

interface WebhookConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
}

const AVAILABLE_EVENTS = [
  { id: 'session.status', label: 'Session Status', description: 'Changements de statut de session' },
  { id: 'message', label: 'Messages', description: 'Tous les messages reçus/envoyés' },
  { id: 'message.reaction', label: 'Réactions', description: 'Réactions aux messages' },
  { id: 'message.any', label: 'Tous messages', description: 'Tous types de messages' },
  { id: 'message.ack', label: 'Accusés réception', description: 'Messages d\'accusé de réception' },
  { id: 'message.waiting', label: 'Messages en attente', description: 'Messages en attente d\'envoi' },
  { id: 'message.revoked', label: 'Messages révoqués', description: 'Messages supprimés' },
  { id: 'message.edited', label: 'Messages modifiés', description: 'Messages édités' },
  { id: 'state.change', label: 'Changements d\'état', description: 'Changements d\'état WhatsApp' },
  { id: 'group.join', label: 'Rejoindre groupe', description: 'Quelqu\'un rejoint un groupe' },
  { id: 'group.leave', label: 'Quitter groupe', description: 'Quelqu\'un quitte un groupe' },
  { id: 'presence.update', label: 'Mise à jour présence', description: 'Statut en ligne/hors ligne' },
  { id: 'call.received', label: 'Appel reçu', description: 'Appels WhatsApp reçus' },
  { id: 'call.accepted', label: 'Appel accepté', description: 'Appels WhatsApp acceptés' },
  { id: 'call.rejected', label: 'Appel rejeté', description: 'Appels WhatsApp rejetés' }
];

const PRESET_WEBHOOKS = [
  {
    name: 'Suivi Lead Basique',
    url: 'https://ia.bot.bj/webhook/lead-basic',
    events: ['message', 'session.status']
  },
  {
    name: 'Intégration Complète',
    url: 'https://ia.bot.bj/webhook/complete',
    events: ['message', 'session.status', 'message.ack', 'state.change']
  },
  {
    name: 'Formulaire Contact',
    url: 'https://ia.bot.bj/webhook/contact-form',
    events: ['message']
  }
];

const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  open,
  onOpenChange,
  sessionName
}) => {
  const { getSessionConfig, updateSessionConfig, sessions, refreshSessions } = useWAHADashboard();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [currentWebhook, setCurrentWebhook] = useState<WebhookConfig>({
    url: '',
    events: ['message', 'session.status']
  });
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [sessionSelected, setSessionSelected] = useState<string>(sessionName || '');

  // Charger la configuration existante quand la modal s'ouvre
  useEffect(() => {
    if (open && sessionSelected) {
      loadSessionConfig();
    }
  }, [open, sessionSelected]);

  // Mettre à jour la session sélectionnée quand sessionName change
  useEffect(() => {
    if (sessionName) {
      setSessionSelected(sessionName);
    }
  }, [sessionName]);

  const loadSessionConfig = async () => {
    if (!sessionSelected) return;
    
    setConfigLoading(true);
    try {
      const config = await getSessionConfig(sessionSelected);
      if (config?.config?.webhooks) {
        setWebhooks(config.config.webhooks);
      } else {
        setWebhooks([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const addWebhook = async () => {
    if (!currentWebhook.url.trim()) {
      toast.error('Veuillez saisir une URL webhook');
      return;
    }

    if (!sessionSelected) {
      toast.error('Veuillez sélectionner une session WhatsApp');
      return;
    }

    if (currentWebhook.events.length === 0) {
      toast.error('Veuillez sélectionner au moins un événement');
      return;
    }

    setLoading(true);
    try {
      // Charger d'abord la configuration existante
      const existingConfig = await getSessionConfig(sessionSelected);
      
      const updatedWebhooks = [...webhooks, currentWebhook];
      
      const newConfig = {
        name: sessionSelected,
        config: {
          ...existingConfig?.config,
          webhooks: updatedWebhooks
        }
      };

      await updateSessionConfig(sessionSelected, newConfig);
      
      // Mettre à jour l'état local
      setWebhooks(updatedWebhooks);
      
      // Réinitialiser le formulaire
      setCurrentWebhook({
        url: '',
        events: ['message', 'session.status']
      });

      // Recharger la configuration
      await loadSessionConfig();
      
      toast.success('Webhook ajouté avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout:', error);
      toast.error(`Erreur lors de l'ajout du webhook: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const removeWebhook = async (index: number) => {
    if (!sessionSelected) return;

    setLoading(true);
    try {
      const existingConfig = await getSessionConfig(sessionSelected);
      const updatedWebhooks = webhooks.filter((_, i) => i !== index);
      
      const newConfig = {
        name: sessionSelected,
        config: {
          ...existingConfig?.config,
          webhooks: updatedWebhooks
        }
      };

      await updateSessionConfig(sessionSelected, newConfig);
      setWebhooks(updatedWebhooks);
      toast.success('Webhook supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du webhook');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setCurrentWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const usePresetWebhook = (preset: typeof PRESET_WEBHOOKS[0]) => {
    setCurrentWebhook({
      url: preset.url,
      events: preset.events
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Webhook className="w-5 h-5" />
            <span>Configuration Webhook - Session WhatsApp</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Comment ça marche */}
          <Card>
            <CardHeader>
              <CardTitle>Comment Fonctionnent les Webhooks WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h4 className="font-semibold mb-1">Événement WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">Message reçu, changement de statut, etc.</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <h4 className="font-semibold mb-1">Webhook Déclenché</h4>
                  <p className="text-sm text-muted-foreground">Données envoyées à votre URL</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <h4 className="font-semibold mb-1">Traitement</h4>
                  <p className="text-sm text-muted-foreground">Votre système traite l'événement</p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Plateformes compatibles :</strong> Zapier, Make.com, n8n, votre propre API, etc.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Webhooks configurés */}
          {sessionSelected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Webhooks Configurés pour {sessionSelected}</span>
                  <Button onClick={loadSessionConfig} variant="outline" size="sm" disabled={configLoading}>
                    {configLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualiser'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {configLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Chargement de la configuration...</span>
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun webhook configuré pour cette session</p>
                    <p className="text-sm">Ajoutez votre premier webhook ci-dessous</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((webhook, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{webhook.url}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="secondary" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            URL: {webhook.url}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeWebhook(index)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ajouter un nouveau webhook */}
          {sessionSelected && (
            <Card>
              <CardHeader>
                <CardTitle>Ajouter un Webhook pour {sessionSelected}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Presets */}
                <div>
                  <Label>Modèles Prédéfinis</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {PRESET_WEBHOOKS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => usePresetWebhook(preset)}
                        className="text-left h-auto p-3"
                      >
                        <div>
                          <div className="font-medium text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground">{preset.events.join(', ')}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* URL du webhook */}
                <div>
                  <Label htmlFor="webhook-url">URL du Webhook</Label>
                  <Input
                    id="webhook-url"
                    value={currentWebhook.url}
                    onChange={(e) => setCurrentWebhook({ ...currentWebhook, url: e.target.value })}
                    placeholder="https://votre-site.com/webhook"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL où les événements WhatsApp seront envoyés
                  </p>
                </div>

                {/* Événements */}
                <div>
                  <Label>Événements à Surveiller</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div key={event.id} className="flex items-start space-x-2 p-2 border rounded">
                        <Checkbox
                          id={event.id}
                          checked={currentWebhook.events.includes(event.id)}
                          onCheckedChange={() => toggleEvent(event.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={event.id} className="text-sm font-medium cursor-pointer">
                            {event.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Fermer
                  </Button>
                  <Button 
                    onClick={addWebhook} 
                    disabled={loading || !sessionSelected || !currentWebhook.url.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter le Webhook
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebhookConfigModal;