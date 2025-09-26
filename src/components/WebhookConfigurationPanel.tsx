import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useProspectEvaluationWebhook } from '@/hooks/useProspectEvaluationWebhook';
import { 
  Settings, 
  Link, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Save,
  TestTube
} from 'lucide-react';

interface WebhookConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookConfigurationPanel: React.FC<WebhookConfigurationPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { webhookConfig, setWebhookConfig, testWebhook, isLoading } = useProspectEvaluationWebhook();
  
  const [formData, setFormData] = useState({
    url: webhookConfig?.url || 'https://ia.bot.bj/webhook/precall',
    name: webhookConfig?.name || 'Évaluation Prospect Pre-Call',
    isActive: webhookConfig?.isActive ?? true
  });
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleSave = () => {
    if (!formData.url.trim()) {
      toast.error('L\'URL du webhook est requise');
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      toast.error('URL invalide');
      return;
    }

    setWebhookConfig({
      url: formData.url.trim(),
      name: formData.name.trim() || 'Webhook IA',
      isActive: formData.isActive
    });

    toast.success('Configuration webhook sauvegardée');
    onClose();
  };

  const handleTest = async () => {
    if (!formData.url.trim()) {
      toast.error('Veuillez d\'abord saisir une URL');
      return;
    }

    setTestStatus('testing');
    
    // Test temporaire avec l'URL saisie
    const tempConfig = {
      url: formData.url.trim(),
      name: formData.name.trim(),
      isActive: true
    };
    
    setWebhookConfig(tempConfig);
    
    const success = await testWebhook();
    setTestStatus(success ? 'success' : 'error');
    
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            Configuration Webhook IA
          </CardTitle>
          <p className="text-muted-foreground">
            Configurez l'URL webhook pour l'évaluation automatique des prospects
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Statut actuel */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Statut actuel</h3>
              {webhookConfig?.isActive ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="w-3 h-3 mr-1" />
                  Inactif
                </Badge>
              )}
            </div>
            {webhookConfig?.url && (
              <p className="text-sm text-gray-600 break-all">{webhookConfig.url}</p>
            )}
          </div>

          {/* Formulaire de configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Nom du webhook</Label>
              <Input
                id="webhook-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Évaluation Prospect Pre-Call"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                URL du webhook
              </Label>
              <Input
                id="webhook-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://votre-domaine.com/webhook/evaluation"
                className="h-12 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                L'URL qui recevra les données du prospect pour traitement
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <h4 className="font-medium text-blue-900">Webhook actif</h4>
                <p className="text-sm text-blue-700">
                  Activer/désactiver l'envoi automatique vers le webhook
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          {/* Test du webhook */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-yellow-900 flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Test de connexion
                </h4>
                <p className="text-sm text-yellow-700">
                  Vérifiez que le webhook répond correctement
                </p>
              </div>
              <Button
                onClick={handleTest}
                disabled={testStatus === 'testing' || !formData.url.trim()}
                variant="outline"
                size="sm"
                className="border-yellow-300 hover:bg-yellow-100"
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Test...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Tester
                  </>
                )}
              </Button>
            </div>
            
            {testStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                Webhook testé avec succès
              </div>
            )}
            
            {testStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <XCircle className="w-4 h-4" />
                Erreur lors du test - vérifiez l'URL
              </div>
            )}
          </div>

          {/* Information sur les données envoyées */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Données envoyées
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <code>action</code>: "prospect_evaluation"</p>
              <p>• <code>prospect</code>: Données du prospect (nom, entreprise, etc.)</p>
              <p>• <code>timestamp</code>: Horodatage de la requête</p>
              <p>• <code>metadata</code>: Informations complémentaires</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};