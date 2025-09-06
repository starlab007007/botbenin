import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Webhook, 
  Clock,
  MessageSquare,
  Bell,
  Database
} from 'lucide-react';

interface SessionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  settings: SessionSettings;
  onSave: (settings: SessionSettings) => void;
}

interface SessionSettings {
  name: string;
  webhook?: string;
  autoRestart: boolean;
  messageDelay: number;
  maxRetries: number;
  enableLogs: boolean;
  enableNotifications: boolean;
  customMetadata: Record<string, any>;
  rateLimiting: {
    enabled: boolean;
    messagesPerMinute: number;
    burstLimit: number;
  };
  security: {
    enableWhitelist: boolean;
    allowedNumbers: string[];
    blockUnknown: boolean;
  };
}

const WAHASessionSettings: React.FC<SessionSettingsProps> = ({
  isOpen,
  onClose,
  sessionName,
  settings: initialSettings,
  onSave
}) => {
  const [settings, setSettings] = useState<SessionSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'advanced'>('general');

  const handleSave = () => {
    try {
      onSave(settings);
      toast.success('Paramètres sauvegardés avec succès');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const addAllowedNumber = () => {
    const number = prompt('Entrez le numéro de téléphone (format international):');
    if (number && number.trim()) {
      updateSettings('security.allowedNumbers', [...settings.security.allowedNumbers, number.trim()]);
    }
  };

  const removeAllowedNumber = (index: number) => {
    const newNumbers = settings.security.allowedNumbers.filter((_, i) => i !== index);
    updateSettings('security.allowedNumbers', newNumbers);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Paramètres de Session - {sessionName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { id: 'general', label: 'Général', icon: Settings },
              { id: 'security', label: 'Sécurité', icon: Shield },
              { id: 'advanced', label: 'Avancé', icon: Database }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Configuration de Base
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook">URL Webhook</Label>
                      <Input
                        id="webhook"
                        value={settings.webhook || ''}
                        onChange={(e) => updateSettings('webhook', e.target.value)}
                        placeholder="https://votre-serveur.com/webhook"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="messageDelay">Délai entre messages (ms)</Label>
                      <Input
                        id="messageDelay"
                        type="number"
                        value={settings.messageDelay}
                        onChange={(e) => updateSettings('messageDelay', parseInt(e.target.value))}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoRestart">Redémarrage automatique</Label>
                      <Switch
                        id="autoRestart"
                        checked={settings.autoRestart}
                        onCheckedChange={(checked) => updateSettings('autoRestart', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableLogs">Activer les logs</Label>
                      <Switch
                        id="enableLogs"
                        checked={settings.enableLogs}
                        onCheckedChange={(checked) => updateSettings('enableLogs', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableNotifications">Notifications</Label>
                      <Switch
                        id="enableNotifications"
                        checked={settings.enableNotifications}
                        onCheckedChange={(checked) => updateSettings('enableNotifications', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Limitation de Débit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rateLimitEnabled">Activer la limitation</Label>
                    <Switch
                      id="rateLimitEnabled"
                      checked={settings.rateLimiting.enabled}
                      onCheckedChange={(checked) => updateSettings('rateLimiting.enabled', checked)}
                    />
                  </div>
                  
                  {settings.rateLimiting.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="messagesPerMinute">Messages par minute</Label>
                        <Input
                          id="messagesPerMinute"
                          type="number"
                          value={settings.rateLimiting.messagesPerMinute}
                          onChange={(e) => updateSettings('rateLimiting.messagesPerMinute', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="burstLimit">Limite de rafale</Label>
                        <Input
                          id="burstLimit"
                          type="number"
                          value={settings.rateLimiting.burstLimit}
                          onChange={(e) => updateSettings('rateLimiting.burstLimit', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Paramètres de Sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableWhitelist">Liste blanche activée</Label>
                      <p className="text-sm text-gray-500">Seuls les numéros autorisés peuvent envoyer des messages</p>
                    </div>
                    <Switch
                      id="enableWhitelist"
                      checked={settings.security.enableWhitelist}
                      onCheckedChange={(checked) => updateSettings('security.enableWhitelist', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="blockUnknown">Bloquer les inconnus</Label>
                      <p className="text-sm text-gray-500">Rejeter automatiquement les messages de numéros non reconnus</p>
                    </div>
                    <Switch
                      id="blockUnknown"
                      checked={settings.security.blockUnknown}
                      onCheckedChange={(checked) => updateSettings('security.blockUnknown', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Numéros autorisés</Label>
                      <Button size="sm" onClick={addAllowedNumber}>
                        Ajouter
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {settings.security.allowedNumbers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Aucun numéro autorisé
                        </p>
                      ) : (
                        settings.security.allowedNumbers.map((number, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="font-mono text-sm">{number}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAllowedNumber(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Supprimer
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Métadonnées Personnalisées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customMetadata">Configuration JSON</Label>
                    <Textarea
                      id="customMetadata"
                      value={JSON.stringify(settings.customMetadata, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateSettings('customMetadata', parsed);
                        } catch {
                          // Ignore invalid JSON during typing
                        }
                      }}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder='{\n  "custom_field": "value",\n  "another_field": 123\n}'
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tentatives de connexion</Label>
                    <Input
                      type="number"
                      value={settings.maxRetries}
                      onChange={(e) => updateSettings('maxRetries', parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WAHASessionSettings;