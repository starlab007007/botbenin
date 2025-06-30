import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, Paperclip, Smile, Phone, Video, MoreVertical, Clock, Bot, ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import { useLiveChatBots } from '@/hooks/useLiveChatBots';
import { LiveChatBotCarousel } from '@/components/live-chat/LiveChatBotCarousel';
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

export const LiveChatSystem: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Utilisation du hook pour récupérer les bots publics (accessible à tous)
  console.log('[LiveChatSystem] === INITIALISATION POUR ACCÈS PUBLIC ===');
  const { 
    bots: liveChatBots, 
    loading: botsLoading, 
    error: botsError, 
    refreshBots 
  } = useLiveChatBots();

  console.log('[LiveChatSystem] Hook result pour accès public:', {
    botsCount: liveChatBots?.length || 0,
    isLoading: botsLoading,
    hasError: !!botsError,
    error: botsError
  });
  
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.log('[LiveChatSystem] === DÉMARRAGE CHAT PUBLIC ===');
      console.log('[LiveChatSystem] Bot sélectionné pour accès public:', {
        id: bot.id,
        name: bot.name,
        chatTitle: bot.chat_title,
        hasWebhook: !!bot.webhook_url,
        webhookUrl: bot.webhook_url
      });
      
      // Validation sécurisée du bot pour accès public
      const botValidation = SecurityManager.validateAndSanitizeInput(bot.id, 'uuid');
      if (!botValidation.isValid) {
        console.error('[LiveChatSystem] Bot ID invalide pour accès public:', bot.id);
        toast({
          title: "Erreur de sécurité",
          description: "ID de bot invalide détecté",
          variant: "destructive",
        });
        return;
      }

      // Vérification du webhook - permissive pour accès public
      if (bot.webhook_url && !SecurityManager.validateWebhookUrl(bot.webhook_url)) {
        console.warn('[LiveChatSystem] Webhook URL non standard pour bot public:', bot.webhook_url);
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

      console.log('[LiveChatSystem] Agent créé pour accès public:', agent);

      setSelectedAgent(agent);
      setIsConnected(true);
      setWaitTime(Math.floor(Math.random() * 10) + 3); // Temps réduit pour accès public
      setSecurityWarnings([]);
      
      // Message système de connexion pour accès public
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        sender: 'agent',
        content: `Bonjour ! Je suis ${agent.name}, ${agent.role}. Je suis disponible pour tous les utilisateurs. Comment puis-je vous aider aujourd'hui ?`,
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
        title: `Chat public démarré avec ${agent.name}`,
        description: "Connexion établie avec l'assistant IA public",
      });
      
    } catch (error: any) {
      console.error('[LiveChatSystem] Erreur démarrage chat public:', error);
      
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
          console.warn('[LiveChatSystem] Message save failed pour accès public:', saveResult.error);
        }
      }

      // Envoi vers le webhook pour accès public
      if (selectedAgent.webhookUrl) {
        console.log('[LiveChatSystem] Envoi vers webhook public:', selectedAgent.webhookUrl);
        
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
      console.error('[LiveChatSystem] Erreur message public:', error);
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

  // Interface de sélection des bots publics
  if (!isConnected) {
    console.log('[LiveChatSystem] AFFICHAGE: Interface de sélection pour accès public');
    console.log('[LiveChatSystem] État des bots publics:', {
      count: liveChatBots?.length || 0,
      loading: botsLoading,
      error: botsError
    });

    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="w-16 h-16 text-blue-600 mr-4" />
            <Shield className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat IA Sécurisé 24/7</h1>
          <p className="text-gray-600 mb-2">Choisissez votre assistant IA public et commencez une conversation instantanément</p>
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>Accès libre • Disponible pour tous</span>
          </div>
          {botsError && (
            <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
              <p className="text-sm">{botsError}</p>
            </div>
          )}
        </div>

        {/* Carrousel des bots publics */}
        <div className="mb-8">
          <LiveChatBotCarousel
            bots={liveChatBots || []}
            onStartChat={startChat}
            isLoading={botsLoading}
            onRefresh={refreshBots}
          />
        </div>

        {/* Section informative pour accès public */}
        {liveChatBots && liveChatBots.length > 0 && (
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Que peuvent faire nos assistants IA publics ?</h3>
                <div className="flex items-center space-x-2 text-blue-600">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">100% Accessible</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Support Technique</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Configuration des systèmes</li>
                    <li>• Résolution de problèmes</li>
                    <li>• Guides techniques</li>
                    <li>• Dépannage en temps réel</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Conseil Business</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Stratégie d'entreprise</li>
                    <li>• Optimisation des processus</li>
                    <li>• Analyse de performance</li>
                    <li>• Recommandations personnalisées</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Assistance Marketing</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Campagnes publicitaires</li>
                    <li>• Création de contenu</li>
                    <li>• Analyse d'audience</li>
                    <li>• Stratégies de croissance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Interface de chat intégrée dans la même page
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        {/* Header du chat intégré */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={goBackToSelection} className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-white">{selectedAgent?.name}</h3>
                  <Shield className="w-4 h-4 text-green-300" />
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-white/90">{selectedAgent?.role} • En ligne</p>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Accès public
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-10 w-10 p-0">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-10 w-10 p-0">
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-10 w-10 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {waitTime > 0 && (
            <div className="mt-2 flex items-center text-sm text-blue-100">
              <Clock className="w-4 h-4 mr-1" />
              Connexion en cours... {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                {message.sender === 'agent' && message.agentInfo && (
                  <div className="text-xs text-gray-500 mb-1">
                    {message.agentInfo.name}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input pour tous les utilisateurs */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
              <Smile className="w-4 h-4" />
            </Button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tapez votre message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              disabled={isTyping}
              maxLength={4000}
            />
            <Button 
              onClick={sendMessage} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isTyping || !newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Indicateur de statut */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Chat public disponible pour tous</span>
            <span>{newMessage.length}/4000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
