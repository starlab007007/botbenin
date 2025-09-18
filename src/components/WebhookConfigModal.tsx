import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Globe, 
  Play, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';

interface WebhookConfig {
  url: string;
  isActive: boolean;
  name: string;
}

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookConfig: WebhookConfig | null;
  onSave: (config: WebhookConfig) => void;
  onDelete: () => void;
  onTest: () => Promise<boolean>;
  isLoading: boolean;
}

export const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  isOpen,
  onClose,
  webhookConfig,
  onSave,
  onDelete,
  onTest,
  isLoading
}) => {
  const [formData, setFormData] = useState<WebhookConfig>({
    url: 'https://ia.bot.bj/webhook/precall',
    isActive: true,
    name: 'Évaluation Prospect Pre-Call'
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (webhookConfig) {
      setFormData(webhookConfig);
    }
  }, [webhookConfig]);

  const handleSave = () => {
    if (!formData.url.trim()) {
      return;
    }
    onSave(formData);
    onClose();
  };

  const handleTest = async () => {
    setTestStatus('testing');
    const success = await onTest();
    setTestStatus(success ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette configuration webhook ?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Configuration Webhook d'Évaluation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut actuel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                Statut du Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={formData.isActive ? 'default' : 'secondary'}>
                    {formData.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Actif
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Inactif
                      </>
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formData.isActive ? 'Le webhook sera déclenché lors des évaluations' : 'Le webhook est désactivé'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={!formData.url.trim() || testStatus === 'testing'}
                  className="flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  {testStatus === 'testing' ? 'Test...' : 'Tester'}
                </Button>
              </div>
              
              {testStatus !== 'idle' && (
                <div className={`mt-3 p-2 rounded text-sm ${
                  testStatus === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : testStatus === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {testStatus === 'success' && 'Test réussi - Le webhook répond correctement'}
                  {testStatus === 'error' && 'Test échoué - Vérifiez l\'URL et la connectivité'}
                  {testStatus === 'testing' && 'Test en cours...'}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Nom du Webhook</Label>
              <Input
                id="webhook-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom descriptif du webhook"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                URL du Webhook
              </Label>
              <Input
                id="webhook-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://ia.bot.bj/webhook/precall"
              />
              <p className="text-xs text-muted-foreground">
                Cette URL sera appelée à chaque évaluation de prospect
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="webhook-active">Activer le Webhook</Label>
                <p className="text-xs text-muted-foreground">
                  Le webhook sera automatiquement déclenché lors des évaluations
                </p>
              </div>
              <Switch
                id="webhook-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          {/* Informations sur les données envoyées */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-800">
                Données Envoyées
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700">
              <p>Le webhook recevra les données suivantes :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Action : "prospect_evaluation"</li>
                <li>Timestamp de l'évaluation</li>
                <li>Données complètes du prospect</li>
                <li>Source : "prospect_preparation_interface"</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          {webhookConfig && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
          
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={!formData.url.trim() || isLoading}
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};