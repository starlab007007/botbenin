
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSecureSessionManager } from '@/hooks/useSecureSessionManager';
import { SecureMessageHandler } from '@/services/security/SecureMessageHandler';
import { SecurityManager } from '@/services/security/SecurityManager';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  agentInfo?: {
    name: string;
    role: string;
    rating: number;
  };
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'offline';
  rating: number;
  responseTime: string;
  languages: string[];
  specialties: string[];
  webhookUrl?: string;
  chatContext?: string;
}

export const useChatLogic = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const {
    sessionToken,
    isInitializing: sessionInitializing,
    isReady: sessionReady,
    error: sessionError,
    securityStatus,
    retryInitialization,
    updateActivity,
    clearSession
  } = useSecureSessionManager({
    botId: selectedAgent?.id || null,
    entryPoint: 'live_chat_system_public'
  });

  useEffect(() => {
    if (!isConnected && waitTime > 0) {
      const timer = setInterval(() => {
        setWaitTime(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isConnected, waitTime]);

  const startChat = async (bot: any) => {
    try {
      console.log('[useChatLogic] === DÉMARRAGE CHAT PUBLIC ===');
      console.log('[useChatLogic] Bot sélectionné pour accès public:', {
        id: bot.id,
        name: bot.name,
        chatTitle: bot.chat_title,
        hasWebhook: !!bot.webhook_url,
        webhookUrl: bot.webhook_url
      });
      
      // Validation sécurisée du bot pour accès public
      const botValidation = SecurityManager.validateAndSanitizeInput(bot.id, 'uuid');
      if (!botValidation.isValid) {
        console.error('[useChatLogic] Bot ID invalide pour accès public:', bot.id);
        toast({
          title: "Erreur de sécurité",
          description: "ID de bot invalide détecté",
          variant: "destructive",
        });
        return;
      }

      // Vérification du webhook - permissive pour accès public
      if (bot.webhook_url && !SecurityManager.validateWebhookUrl(bot.webhook_url)) {
        console.warn('[useChatLogic] Webhook URL non standard pour bot public:', bot.webhook_url);
        toast({
          title: "Configuration webhook adaptée",
          description: `Le bot "${bot.name}" utilise une configuration optimisée pour l'accès public.`,
          variant: "default",
        });
      }

      // Audit de sécurité pour le démarrage du chat public
      await SecurityManager.auditSuspiciousActivity({
        action: 'public_chat_started',
        additionalData: { 
          botId: botValidation.sanitized,
          botName: bot.name,
          hasValidWebhook: !!bot.webhook_url,
          accessType: 'public'
        }
      });

      // Convertir le bot en agent pour accès public
      const agent: Agent = {
        id: botValidation.sanitized!,
        name: SecurityManager.validateAndSanitizeInput(bot.chat_title || bot.name, 'string').sanitized || 'Bot',
        role: SecurityManager.validateAndSanitizeInput(bot.description || 'Assistant IA Public', 'string').sanitized || 'Assistant IA Public',
        status: 'online',
        rating: 4.8,
        responseTime: '< 1 min',
        languages: ['Français'],
        specialties: [bot.chat_context || 'Assistance générale'],
        webhookUrl: bot.webhook_url,
        chatContext: bot.chat_context
      };

      console.log('[useChatLogic] Agent créé pour accès public:', agent);

      setSelectedAgent(agent);
      setIsConnected(true);
      setWaitTime(Math.floor(Math.random() * 10) + 3);
      setSecurityWarnings([]);
      
      // Message système de connexion amélioré pour accès public
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        sender: 'agent',
        content: `👋 Bonjour et bienvenue ! Je suis ${agent.name}, votre ${agent.role}.\n\nJe suis là pour vous aider 24h/24 et 7j/7. N'hésitez pas à utiliser les suggestions de messages ci-dessous pour commencer notre conversation.\n\nComment puis-je vous être utile aujourd'hui ?`,
        timestamp: new Date(),
        type: 'system',
        agentInfo: {
          name: agent.name,
          role: agent.role,
          rating: agent.rating
        }
      };
      
      setMessages([welcomeMessage]);

      toast({
        title: `💬 Chat démarré avec ${agent.name}`,
        description: "Interface de chat identique au mode test",
      });
      
    } catch (error: any) {
      console.error('[useChatLogic] Erreur démarrage chat public:', error);
      
      await SecurityManager.auditSuspiciousActivity({
        action: 'public_chat_start_failed',
        additionalData: { error: error.message, botId: bot.id, accessType: 'public' }
      });

      toast({
        title: "Erreur de connexion",
        description: "Impossible de démarrer le chat public. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAgent) return;

    // Validation sécurisée du message pour accès public
    const messageValidation = SecurityManager.validateAndSanitizeInput(newMessage, 'string');
    if (!messageValidation.isValid) {
      toast({
        title: "Message invalide",
        description: "Le contenu du message contient des éléments non autorisés",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: messageValidation.sanitized!,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = messageValidation.sanitized!;
    setNewMessage('');
    setIsTyping(true);

    // Mise à jour de l'activité de session si disponible
    if (sessionToken) {
      updateActivity();
    }

    try {
      // Sauvegarde sécurisée du message si session disponible
      if (sessionToken) {
        const saveResult = await SecureMessageHandler.sendSecureMessage(
          selectedAgent.id,
          sessionToken,
          messageContent,
          'user'
        );

        if (!saveResult.success) {
          console.warn('[useChatLogic] Message save failed pour accès public:', saveResult.error);
        }
      }

      // Envoi vers le webhook pour accès public
      if (selectedAgent.webhookUrl) {
        console.log('[useChatLogic] Envoi vers webhook public:', selectedAgent.webhookUrl);
        
        const response = await fetch(selectedAgent.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Bot-Platform': 'bot_bj_public',
          },
          body: JSON.stringify({
            message: messageContent,
            timestamp: new Date().toISOString(),
            session_id: sessionToken || `public_session_${Date.now()}`,
            user_id: `public_user_${Date.now()}`,
            source: 'live_chat_system_public',
            context: selectedAgent.chatContext || 'public_support',
            chat_title: selectedAgent.name,
            bot_id: selectedAgent.id,
            interface_type: 'live_chat_system_public',
            access_type: 'public',
            public_access: true
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let botResponse = data.output || data.message || data.response || "Merci pour votre message. Comment puis-je vous aider davantage ?";
          
          // Validation de la réponse du bot
          const responseValidation = SecurityManager.validateAndSanitizeInput(botResponse, 'string');
          if (responseValidation.isValid) {
            botResponse = responseValidation.sanitized!;
          } else {
            botResponse = "Réponse reçue mais contenu non sécurisé détecté.";
          }
          
          setTimeout(() => {
            setIsTyping(false);
            const agentResponse: Message = {
              id: (Date.now() + 1).toString(),
              sender: 'agent',
              content: botResponse,
              timestamp: new Date(),
              type: 'text',
              agentInfo: selectedAgent ? {
                name: selectedAgent.name,
                role: selectedAgent.role,
                rating: selectedAgent.rating
              } : undefined
            };
            setMessages(prev => [...prev, agentResponse]);

            // Sauvegarde sécurisée de la réponse si session disponible
            if (sessionToken) {
              SecureMessageHandler.sendSecureMessage(
                selectedAgent.id,
                sessionToken,
                botResponse,
                'bot'
              );
            }
          }, 800 + Math.random() * 1200);
        } else {
          throw new Error('Erreur de réponse du webhook public');
        }
      }
    } catch (error: any) {
      console.error('[useChatLogic] Erreur message public:', error);
      setIsTyping(false);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: "Je rencontre un problème technique. Veuillez réessayer dans quelques instants.",
        timestamp: new Date(),
        type: 'text',
        agentInfo: selectedAgent ? {
          name: selectedAgent.name,
          role: selectedAgent.role,
          rating: selectedAgent.rating
        } : undefined
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const goBackToSelection = () => {
    setIsConnected(false);
    setSelectedAgent(null);
    setMessages([]);
    setNewMessage('');
    setIsTyping(false);
    setWaitTime(0);
    setSecurityWarnings([]);
    if (sessionToken) {
      clearSession();
    }
  };

  return {
    isConnected,
    selectedAgent,
    messages,
    newMessage,
    setNewMessage,
    isTyping,
    waitTime,
    securityWarnings,
    startChat,
    sendMessage,
    goBackToSelection
  };
};
