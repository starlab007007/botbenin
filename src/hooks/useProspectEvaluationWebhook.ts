import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebhookConfig {
  url: string;
  isActive: boolean;
  name: string;
}

interface ProspectData {
  id: string;
  [key: string]: any;
}

interface UseProspectEvaluationWebhookReturn {
  webhookConfig: WebhookConfig | null;
  isLoading: boolean;
  setWebhookConfig: (config: WebhookConfig | null) => void;
  triggerEvaluation: (prospectData: ProspectData, updateRunInSheet?: (prospectId: string, value: string) => Promise<boolean>) => Promise<boolean>;
  testWebhook: () => Promise<boolean>;
}

export const useProspectEvaluationWebhook = (): UseProspectEvaluationWebhookReturn => {
  const { toast } = useToast();
  const [webhookConfig, setWebhookConfigState] = useState<WebhookConfig | null>({
    url: 'https://ia.bot.bj/webhook/precall',
    isActive: true,
    name: 'Évaluation Prospect Pre-Call'
  });
  const [isLoading, setIsLoading] = useState(false);

  const setWebhookConfig = useCallback((config: WebhookConfig | null) => {
    setWebhookConfigState(config);
    // Sauvegarder dans localStorage pour persister la configuration
    if (config) {
      localStorage.setItem('prospect-evaluation-webhook', JSON.stringify(config));
    } else {
      localStorage.removeItem('prospect-evaluation-webhook');
    }
  }, []);

  // Charger la configuration depuis localStorage au montage
  useState(() => {
    const savedConfig = localStorage.getItem('prospect-evaluation-webhook');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setWebhookConfigState(config);
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration webhook:', error);
      }
    }
  });

  const triggerEvaluation = useCallback(async (
    prospectData: ProspectData, 
    updateRunInSheet?: (prospectId: string, value: string) => Promise<boolean>
  ): Promise<boolean> => {
    if (!webhookConfig || !webhookConfig.isActive || !webhookConfig.url) {
      toast({
        title: "Webhook non configuré",
        description: "Veuillez configurer le webhook d'évaluation",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    // Automatiquement mettre la colonne Run à "TRUE" avant de déclencher l'évaluation
    if (updateRunInSheet) {
      const updateSuccess = await updateRunInSheet(prospectData.id, 'true');
      if (!updateSuccess) {
        toast({
          title: "Erreur de mise à jour",
          description: "Impossible de mettre à jour le statut dans Google Sheets",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
    }

    try {
      const payload = {
        action: 'prospect_evaluation',
        timestamp: new Date().toISOString(),
        prospect: prospectData,
        source: 'prospect_preparation_interface',
        metadata: {
          user_triggered: true,
          run_status: 'true'
        }
      };

      console.log('🚀 Déclenchement webhook:', {
        url: webhookConfig.url,
        prospectId: prospectData.id,
        runStatus: 'true'
      });

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Réponse webhook:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json().catch(() => null);
      console.log('✅ Webhook réussi:', responseData);

      toast({
        title: "Évaluation déclenchée",
        description: `Prospect ${prospectData.id} envoyé pour évaluation`,
      });

      // Après succès, programmer la remise à FALSE après un délai (simulation de fin d'évaluation)
      if (updateRunInSheet) {
        setTimeout(async () => {
          try {
            await updateRunInSheet(prospectData.id, 'false');
            toast({
              title: "Évaluation terminée",
              description: `Le statut du prospect ${prospectData.id} a été remis à jour`,
            });
          } catch (error) {
            console.error('Erreur lors de la remise à FALSE:', error);
          }
        }, 30000); // 30 secondes pour simuler le délai d'évaluation
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur webhook:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur d'évaluation",
        description: `Impossible de déclencher l'évaluation: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [webhookConfig, toast]);

  const testWebhook = useCallback(async (): Promise<boolean> => {
    if (!webhookConfig || !webhookConfig.url) {
      toast({
        title: "Webhook non configuré",
        description: "Veuillez configurer le webhook d'évaluation",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const payload = {
        action: 'webhook_test',
        timestamp: new Date().toISOString(),
        test: true,
        message: 'Test de connexion webhook'
      };

      console.log('🧪 Test webhook:', webhookConfig.url);

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Réponse test:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      toast({
        title: "Test réussi",
        description: "Le webhook répond correctement",
      });

      return true;
    } catch (error) {
      console.error('❌ Erreur test webhook:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: "Test échoué",
        description: `Le webhook ne répond pas: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [webhookConfig, toast]);

  return {
    webhookConfig,
    isLoading,
    setWebhookConfig,
    triggerEvaluation,
    testWebhook
  };
};