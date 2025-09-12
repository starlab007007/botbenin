import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebhookResponse {
  message: string;
  data?: any;
}

interface UseWebhookReturn {
  isLoading: boolean;
  sendToWebhook: (message: string) => Promise<WebhookResponse | null>;
  setWebhookUrl: (url: string) => void;
  webhookUrl: string;
}

export const useWebhook = (defaultUrl?: string): UseWebhookReturn => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrlState] = useState(defaultUrl || '');

  const sendToWebhook = useCallback(async (message: string): Promise<WebhookResponse | null> => {
    if (!webhookUrl) {
      // Simulate response for demo
      setIsLoading(true);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          setIsLoading(false);
          const responses = [
            "Bonjour ! Je suis Jarvis, votre assistant IA. Comment puis-je vous aider aujourd'hui ?",
            "Je suis là pour vous assister. Que souhaitez-vous faire ?",
            "Parfait ! J'ai bien reçu votre message. Que puis-je faire pour vous ?",
            "Excellente question ! Laissez-moi analyser cela pour vous...",
            "Je comprends. Voici ce que je peux vous proposer..."
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          resolve({ message: randomResponse });
        }, 1500 + Math.random() * 1000);
      });
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          source: 'kpakpato_voice_interface'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      toast({
        title: "Message envoyé",
        description: "Réponse reçue avec succès",
      });
      
      return data;
    } catch (error) {
      console.error('Webhook error:', error);
      
      toast({
        title: "Erreur webhook",
        description: "Impossible de contacter le service",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [webhookUrl, toast]);

  const setWebhookUrl = useCallback((url: string) => {
    setWebhookUrlState(url);
  }, []);

  return {
    isLoading,
    sendToWebhook,
    setWebhookUrl,
    webhookUrl
  };
};