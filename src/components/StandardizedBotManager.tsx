
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BotConfigService, StandardBotConfig } from '@/services/botConfigService';
import { supabase } from '@/integrations/supabase/client';
import { Bot, CheckCircle, XCircle, AlertTriangle, Save, Zap } from 'lucide-react';

interface StandardizedBotManagerProps {
  botId?: string;
  onSave?: (bot: StandardBotConfig) => void;
  onCancel?: () => void;
}

export const StandardizedBotManager: React.FC<StandardizedBotManagerProps> = ({
  botId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState(BotConfigService.getDefaultBotConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [validation, setValidation] = useState({ isValid: true, errors: [], warnings: [] });
  const { toast } = useToast();

  useEffect(() => {
    if (botId) {
      loadBotConfig();
    }
  }, [botId]);

  useEffect(() => {
    // Valider en temps réel
    const validationResult = BotConfigService.validateBotConfig(formData);
    setValidation(validationResult);
  }, [formData]);

  const loadBotConfig = async () => {
    if (!botId) return;

    try {
      setIsLoading(true);
      const config = await BotConfigService.getBotConfig(botId);
      if (config) {
        setFormData(config);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration du bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.isValid) {
      toast({
        title: "Configuration invalide",
        description: "Veuillez corriger les erreurs avant de sauvegarder",
        variant: "destructive",
      });
      return;
    }

    // Ensure required fields are present
    if (!formData.name?.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du bot est obligatoire",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté pour créer un bot');
      }

      // Vérifier ou créer automatiquement le bot_owner
      let { data: ownerData, error: ownerError } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', user.id)
        .single();

      if (ownerError || !ownerData) {
        // Créer automatiquement le bot_owner si il n'existe pas
        const { data: newOwnerData, error: createOwnerError } = await supabase
          .from('bot_owners')
          .insert({
            user_id: user.id,
            max_bots: 10,
            subscription_plan: 'free'
          })
          .select('id, max_bots')
          .single();

        if (createOwnerError) {
          console.error('Erreur lors de la création du propriétaire:', createOwnerError);
          throw new Error('Impossible de créer votre compte propriétaire de bot');
        }
        ownerData = newOwnerData;
      }

      if (botId) {
        // Mise à jour - ensure all required fields are properly typed
        const updateData = {
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          webhook_url: formData.webhook_url?.trim() || '',
          chat_title: formData.chat_title?.trim() || '',
          chat_context: formData.chat_context || 'general',
          share_enabled: formData.share_enabled || false,
          is_active: formData.is_active !== false,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('bots')
          .update(updateData)
          .eq('id', botId)
          .eq('owner_id', ownerData.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Bot mis à jour !",
          description: "La configuration du bot a été sauvegardée avec succès",
        });

        if (onSave) onSave(data);
      } else {
        // Création - ensure all required fields are properly typed
        const insertData = {
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          webhook_url: formData.webhook_url?.trim() || '',
          chat_title: formData.chat_title?.trim() || '',
          chat_context: formData.chat_context || 'general',
          share_enabled: formData.share_enabled || false,
          is_active: formData.is_active !== false,
          owner_id: ownerData.id
        };

        const { data, error } = await supabase
          .from('bots')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Bot créé !",
          description: "Votre nouveau bot a été créé avec succès",
        });

        if (onSave) onSave(data);
      }

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      
      let errorMessage = "Impossible de sauvegarder le bot";
      
      // Messages d'erreur spécifiques
      if (error.message?.includes('Vous devez être connecté')) {
        errorMessage = "Vous devez être connecté pour créer un bot";
      } else if (error.message?.includes('compte propriétaire')) {
        errorMessage = "Erreur de configuration du compte. Veuillez réessayer.";
      } else if (error.code === '23505') {
        errorMessage = "Un bot avec ce nom existe déjà";
      } else if (error.code === 'PGRST116') {
        errorMessage = "Permission refusée. Vérifiez vos droits d'accès.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testBot = async () => {
    if (!formData.webhook_url) {
      toast({
        title: "Test impossible",
        description: "Veuillez configurer l'URL du webhook pour tester le bot",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTesting(true);

      const headers = BotConfigService.getStandardWebhookHeaders(
        botId || 'test',
        formData.name || 'Bot Test',
        formData.chat_context || 'general',
        true
      );

      const payload = BotConfigService.createStandardWebhookPayload(
        "Test de configuration - Ce message provient du gestionnaire de bots pour vérifier la connectivité.",
        botId || 'test',
        formData.name || 'Bot Test',
        formData.chat_context || 'general',
        undefined,
        true
      );

      const response = await fetch(formData.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Test réussi !",
          description: "Le webhook répond correctement",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      console.error('Erreur lors du test:', error);
      toast({
        title: "Test échoué",
        description: "Le webhook ne répond pas correctement",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const contextOptions = [
    { value: 'general', label: 'Général' },
    { value: 'business', label: 'Business' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'gestion', label: 'Gestion' },
    { value: 'citoyen', label: 'Citoyen' },
    { value: 'services_locaux', label: 'Services Locaux' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'automation', label: 'Automatisation' }
  ];

  if (isLoading && botId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <span>{botId ? 'Modifier le Bot' : 'Créer un Nouveau Bot'}</span>
        </CardTitle>
        
        {/* Indicateurs de validation */}
        <div className="flex flex-wrap gap-2">
          {validation.isValid ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configuration valide
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-600">
              <XCircle className="w-3 h-3 mr-1" />
              {validation.errors.length} erreur(s)
            </Badge>
          )}
          
          {validation.warnings.length > 0 && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {validation.warnings.length} avertissement(s)
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du bot */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Nom du bot *
            </label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Assistant Restaurant"
              className={validation.errors.some(e => e.includes('nom')) ? 'border-red-500' : ''}
            />
            {validation.errors.filter(e => e.includes('nom')).map((error, idx) => (
              <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description *
            </label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du bot et de ses fonctionnalités..."
              rows={3}
              className={validation.errors.some(e => e.includes('description')) ? 'border-red-500' : ''}
            />
            {validation.errors.filter(e => e.includes('description')).map((error, idx) => (
              <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
            ))}
          </div>

          {/* URL du webhook */}
          <div>
            <label className="block text-sm font-medium mb-2">
              URL du Webhook *
            </label>
            <div className="flex space-x-2">
              <Input
                value={formData.webhook_url || ''}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://votre-webhook.com/endpoint"
                className={validation.errors.some(e => e.includes('webhook')) ? 'border-red-500 flex-1' : 'flex-1'}
              />
              <Button
                type="button"
                onClick={testBot}
                disabled={!formData.webhook_url || isTesting}
                variant="outline"
              >
                {isTesting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </Button>
            </div>
            {validation.errors.filter(e => e.includes('webhook')).map((error, idx) => (
              <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
            ))}
          </div>

          {/* Titre du chat */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Titre du Chat *
            </label>
            <Input
              value={formData.chat_title || ''}
              onChange={(e) => setFormData({ ...formData, chat_title: e.target.value })}
              placeholder="Ex: Assistant Restaurant Bot"
              className={validation.errors.some(e => e.includes('titre')) ? 'border-red-500' : ''}
            />
            {validation.errors.filter(e => e.includes('titre')).map((error, idx) => (
              <p key={idx} className="text-red-500 text-xs mt-1">{error}</p>
            ))}
          </div>

          {/* Contexte */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Contexte du Bot
            </label>
            <Select
              value={formData.chat_context || 'general'}
              onValueChange={(value) => setFormData({ ...formData, chat_context: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contextOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation.warnings.filter(e => e.includes('contexte')).map((warning, idx) => (
              <p key={idx} className="text-yellow-600 text-xs mt-1">{warning}</p>
            ))}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="share_enabled"
                checked={formData.share_enabled || false}
                onChange={(e) => setFormData({ ...formData, share_enabled: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="share_enabled" className="text-sm">
                Autoriser le partage public
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active !== false}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm">
                Bot actif
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={!validation.isValid || isLoading || !formData.name?.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {botId ? 'Mettre à jour' : 'Créer le Bot'}
            </Button>
            
            {onCancel && (
              <Button type="button" onClick={onCancel} variant="outline">
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
