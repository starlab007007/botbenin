
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, Paperclip, Smile, Phone, Video, MoreVertical, Star, User, Clock } from 'lucide-react';

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
}

const supportAgents: Agent[] = [
  {
    id: '1',
    name: 'Marie Dubois',
    role: 'Expert Technique',
    status: 'online',
    rating: 4.9,
    responseTime: '< 2 min',
    languages: ['Français', 'Anglais'],
    specialties: ['Automatisations', 'Intégrations API', 'Workflows n8n']
  },
  {
    id: '2',
    name: 'Jean-Pierre Martin',
    role: 'Consultant Business',
    status: 'online',
    rating: 4.8,
    responseTime: '< 3 min',
    languages: ['Français', 'Anglais', 'Espagnol'],
    specialties: ['Stratégie IA', 'Optimisation processus', 'ROI']
  },
  {
    id: '3',
    name: 'Sophie Laurent',
    role: 'Spécialiste Marketing',
    status: 'busy',
    rating: 4.9,
    responseTime: '< 5 min',
    languages: ['Français', 'Anglais'],
    specialties: ['Agents IA Marketing', 'Campagnes automatisées', 'Analytics']
  }
];

export const LiveChatSystem: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const startChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsConnected(true);
    setWaitTime(Math.floor(Math.random() * 180) + 30); // 30-210 secondes
    
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
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulation réponse agent
    setTimeout(() => {
      setIsTyping(false);
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: generateAgentResponse(newMessage),
        timestamp: new Date(),
        type: 'text',
        agentInfo: selectedAgent ? {
          name: selectedAgent.name,
          role: selectedAgent.role,
          rating: selectedAgent.rating
        } : undefined
      };
      setMessages(prev => [...prev, agentResponse]);
    }, 2000 + Math.random() * 3000);
  };

  const generateAgentResponse = (userMessage: string): string => {
    const responses = [
      "Je comprends votre question. Laissez-moi vous expliquer en détail...",
      "C'est une excellente question ! Voici comment procéder...",
      "Je vais vous guider étape par étape pour résoudre ce problème...",
      "Merci pour ces précisions. Je recommande cette approche...",
      "Parfait ! Je vais créer un guide personnalisé pour votre cas..."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="text-center mb-8">
          <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat en Direct 24/7</h1>
          <p className="text-gray-600">Connectez-vous instantanément avec nos experts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {supportAgents.map((agent) => (
            <Card key={agent.id} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">{agent.name}</CardTitle>
                    <p className="text-sm text-gray-600">{agent.role}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'online' ? 'bg-green-500' : 
                    agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Note</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-900">{agent.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Temps de réponse</span>
                    <span className="text-sm font-medium text-gray-900">{agent.responseTime}</span>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600 block mb-1">Spécialités</span>
                    <div className="flex flex-wrap gap-1">
                      {agent.specialties.map((specialty, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={() => startChat(agent)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={agent.status === 'offline'}
                  >
                    {agent.status === 'online' ? 'Démarrer le chat' : 
                     agent.status === 'busy' ? 'File d\'attente' : 'Indisponible'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Que peut faire notre support ?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Support Technique</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Configuration des chatbots</li>
                  <li>• Création d'automatisations</li>
                  <li>• Intégrations API</li>
                  <li>• Dépannage technique</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Conseil Stratégique</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Optimisation des processus</li>
                  <li>• Stratégie d'implémentation IA</li>
                  <li>• Formation équipes</li>
                  <li>• Analyse ROI</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
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
            <div className="mt-2 flex items-center text-sm text-orange-600">
              <Clock className="w-4 h-4 mr-1" />
              Temps d'attente estimé: {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
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
                <p>{message.content}</p>
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
            />
            <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
