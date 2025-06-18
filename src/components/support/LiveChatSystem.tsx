
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, Paperclip, Smile, Phone, Video, MoreVertical, Clock, Bot, ArrowLeft } from 'lucide-react';
import { useLiveChatBots } from '@/hooks/useLiveChatBots';
import { LiveChatBotCarousel } from '@/components/live-chat/LiveChatBotCarousel';
import { useToast } from '@/hooks/use-toast';
import { initializeVisitorTracking } from '@/utils/visitorTracking';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { bots: liveChatBots, loading: botsLoading, error: botsError, refreshBots } = useLiveChatBots();

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
      console.log('[LiveChatSystem] Démarrage du chat avec:', bot.name);
      
      // Vérifier que le bot a un webhook
      if (!bot.webhook_url) {
        toast({
          title: "Configuration manquante",
          description: `Le bot "${bot.name}" n'a pas de webhook configuré.`,
          variant: "destructive",
        });
        return;
      }

      // Initialiser le tracking
      if (bot.webhook_url) {
        await initializeVisitorTracking(bot.id, 'live_chat_system');
        console.log('[LiveChatSystem] Tracking initialisé pour le bot:', bot.id);
      }

      // Convertir le bot en agent pour la compatibilité
      const agent: Agent = {
        id: bot.id,
        name: bot.chat_title || bot.name,
        role: bot.description || 'Assistant IA',
        status: 'online',
        rating: 4.8,
        responseTime: '< 1 min',
        languages: ['Français'],
        specialties: [bot.chat_context || 'Assistance générale'],
        webhookUrl: bot.webhook_url,
        chatContext: bot.chat_context
      };

      setSelectedAgent(agent);
      setIsConnected(true);
      setWaitTime(Math.floor(Math.random() * 20) + 5); // 5-25 secondes
      
      // Message système de connexion
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        sender: 'agent',
        content: `Bonjour ! Je suis ${agent.name}, ${agent.role}. Comment puis-je vous aider aujourd'hui ?`,
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
        title: `Chat démarré avec ${agent.name}`,
        description: "Assistant IA connecté et prêt à vous aider",
      });
      
    } catch (error) {
      console.error('[LiveChatSystem] Erreur lors du démarrage:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de démarrer le chat. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAgent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      if (selectedAgent.webhookUrl) {
        console.log('[LiveChatSystem] Envoi vers webhook:', selectedAgent.webhookUrl);
        
        const response = await fetch(selectedAgent.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            timestamp: new Date().toISOString(),
            session_id: `live_chat_${selectedAgent.id}_${Date.now()}`,
            user_id: `live_user_${Date.now()}`,
            source: 'live_chat_system',
            context: selectedAgent.chatContext || 'live_support',
            chat_title: selectedAgent.name,
            bot_id: selectedAgent.id,
            interface_type: 'live_chat_system'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const botResponse = data.output || data.message || data.response || "Merci pour votre message. Comment puis-je vous aider davantage ?";
          
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
          }, 800 + Math.random() * 1200); // Délai réaliste
        } else {
          throw new Error('Erreur de réponse du webhook');
        }
      }
    } catch (error) {
      console.error('[LiveChatSystem] Erreur lors de l\'envoi:', error);
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
  };

  // Interface de sélection des bots
  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="text-center mb-8">
          <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat IA en Direct 24/7</h1>
          <p className="text-gray-600 mb-2">Choisissez votre assistant IA et commencez la conversation instantanément</p>
          {botsError && (
            <p className="text-orange-600 text-sm">
              {botsError}
            </p>
          )}
        </div>

        {/* Carrousel des bots */}
        <div className="mb-8">
          <LiveChatBotCarousel
            bots={liveChatBots}
            onStartChat={startChat}
            isLoading={botsLoading}
            onRefresh={refreshBots}
          />
        </div>

        {/* Section informative - seulement si des bots sont disponibles */}
        {liveChatBots.length > 0 && (
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Que peuvent faire nos assistants IA ?</h3>
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

  // Interface de chat
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={goBackToSelection}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedAgent?.name}</h3>
                <p className="text-sm text-gray-600">{selectedAgent?.role} • En ligne</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="text-gray-700 border-gray-300">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {waitTime > 0 && (
            <div className="mt-2 flex items-center text-sm text-blue-600">
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

        {/* Input */}
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
            />
            <Button 
              onClick={sendMessage} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isTyping || !newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
