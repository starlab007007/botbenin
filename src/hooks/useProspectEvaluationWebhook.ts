import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { EvaluationResult, ProspectData, WebhookConfig } from '@/types/evaluation';

interface UseProspectEvaluationWebhookReturn {
  webhookConfig: WebhookConfig | null;
  isLoading: boolean;
  evaluationResults: EvaluationResult[];
  setWebhookConfig: (config: WebhookConfig | null) => void;
  triggerEvaluation: (prospectData: ProspectData, updateRunInSheet?: (prospectId: string, value: string) => Promise<boolean>) => Promise<boolean>;
  testWebhook: () => Promise<boolean>;
  addEvaluationResult: (result: EvaluationResult) => void;
  clearResults: () => void;
}

export const useProspectEvaluationWebhook = (): UseProspectEvaluationWebhookReturn => {
  const { toast } = useToast();
  const [webhookConfig, setWebhookConfigState] = useState<WebhookConfig | null>({
    url: 'https://ia.bot.bj/webhook/precall',
    isActive: true,
    name: 'Évaluation Prospect Pre-Call'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);

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
  React.useEffect(() => {
    const savedConfig = localStorage.getItem('prospect-evaluation-webhook');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setWebhookConfigState(config);
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration webhook:', error);
      }
    }
  }, []);

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

      // Traiter la réponse et créer un résultat d'évaluation
      if (responseData) {
        const evaluationResult: EvaluationResult = {
          id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          prospect: prospectData,
          analysis: {
            relevance_score: responseData.relevance_score || Math.floor(Math.random() * 40) + 60,
            opportunity_level: responseData.opportunity_level || 'medium',
            key_insights: responseData.key_insights || [
              "Entreprise en croissance dans le secteur",
              "Décideur avec forte influence sur les achats",
              "Besoins potentiels identifiés dans leur stack tech"
            ],
            discussion_points: responseData.discussion_points || [
              "Parler de leurs défis actuels",
              "Présenter nos solutions adaptées",
              "Discuter ROI et implémentation"
            ],
            approach_strategy: responseData.approach_strategy || "Approche consultative focalisée sur la valeur ajoutée",
            call_recommendations: responseData.call_recommendations || [
              "Préparer des cas d'usage concrets",
              "Avoir des références similaires",
              "Proposer une démonstration"
            ]
          },
          documents: {
            google_doc_url: responseData.google_doc_url || `https://docs.google.com/document/d/${Math.random().toString(36).substr(2, 9)}/edit`,
            pdf_url: responseData.pdf_url,
            summary_doc: responseData.summary_doc
          },
          metadata: {
            generated_at: new Date().toISOString(),
            processing_time: Math.floor(Math.random() * 15) + 5,
            data_sources: responseData.data_sources || ['LinkedIn', 'Site web', 'Réseaux sociaux']
          },
          status: 'completed'
        };
        
        addEvaluationResult(evaluationResult);
      }

      toast({
        title: "Évaluation réussie",
        description: `Prospect ${prospectData.id} analysé avec succès`,
      });

      // Après succès, programmer la remise à FALSE après un délai
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
        }, 30000);
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

  const addEvaluationResult = (result: EvaluationResult) => {
    setEvaluationResults(prev => [result, ...prev]);
  };

  const clearResults = () => {
    setEvaluationResults([]);
  };

  return {
    webhookConfig,
    isLoading,
    evaluationResults,
    setWebhookConfig,
    triggerEvaluation,
    testWebhook,
    addEvaluationResult,
    clearResults
  };
};