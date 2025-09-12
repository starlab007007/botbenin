import { useState } from 'react';

interface WebhookPayload {
  action: string;
  agentId: string;
  timestamp: string;
  userId: string;
  data?: any;
}

interface UseWebhookNotificationReturn {
  isLoading: boolean;
  sendWebhook: (payload: WebhookPayload) => Promise<boolean>;
  lastResponse: any;
}

export const useWebhookNotification = (): UseWebhookNotificationReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  const sendWebhook = async (payload: WebhookPayload): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Primary webhook URL (n8n or custom endpoint)
      const webhookUrl = process.env.VITE_WEBHOOK_URL || 'https://hook.eu2.make.com/your-webhook-endpoint';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'jarvis-conversation',
        },
        body: JSON.stringify({
          ...payload,
          source: 'jarvis-conversation',
          timestamp: new Date().toISOString(),
        })
      });

      const responseData = await response.json().catch(() => ({}));
      setLastResponse(responseData);

      if (response.ok) {
        console.log('✅ Webhook sent successfully:', payload.action);
        return true;
      } else {
        console.error('❌ Webhook failed:', response.status, responseData);
        return false;
      }
    } catch (error) {
      console.error('❌ Webhook error:', error);
      setLastResponse({ error: error.message });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendWebhook,
    lastResponse
  };
};