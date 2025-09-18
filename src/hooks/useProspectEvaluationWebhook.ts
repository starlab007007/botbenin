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
  triggerEvaluation: (prospectData: ProspectData) => Promise<boolean>;
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

  const triggerEvaluation = useCallback(async (prospectData: ProspectData): Promise<boolean> => {
    if (!webhookConfig || !webhookConfig.isActive || !webhookConfig.url) {
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
        action: 'prospect_evaluation',
        timestamp: new Date().toISOString(),
        prospect: prospectData,
        source: 'prospect_preparation_interface'
      };

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Évaluation déclenchée",
        description: `Prospect ${prospectData.id} envoyé pour évaluation`,
      });

      return true;
    } catch (error) {
      console.error('Erreur webhook:', error);
      
      toast({
        title: "Erreur d'évaluation",
        description: "Impossible de déclencher l'évaluation. Vérifiez la configuration du webhook.",
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

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Test réussi",
        description: "Le webhook répond correctement",
      });

      return true;
    } catch (error) {
      console.error('Erreur test webhook:', error);
      
      toast({
        title: "Test échoué",
        description: "Le webhook ne répond pas correctement",
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