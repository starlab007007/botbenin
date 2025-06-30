
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Star, Clock, MessageCircle, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LiveChatBot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  chat_title: string;
  chat_context: string;
  is_active: boolean;
  public_chat_url: string;
  owner_name?: string;
  rating?: number;
  response_time?: string;
  specialties?: string[];
}

interface BotCardProps {
  bot: LiveChatBot;
  onStartChat: (bot: LiveChatBot) => void;
}

const getSpecialtiesFromContext = (context: string): string[] => {
  const contextMap: Record<string, string[]> = {
    'technical': ['Support Technique', 'Dépannage'],
    'business': ['Conseil Business', 'Stratégie'],
    'marketing': ['Marketing IA', 'Campagnes'],
    'customer_service': ['Service Client', 'Support'],
    'sales': ['Vente', 'Conversion'],
    'general': ['Assistance Générale', 'Polyvalent'],
    'automation': ['Automatisation', 'Workflow'],
    'services_locaux': ['Services Locaux', 'Proximité'],
    'restaurant': ['Restaurant', 'Réservation']
  };
  
  return contextMap[context] || ['IA Conversationnelle', 'Support 24/7'];
};

export const BotCard: React.FC<BotCardProps> = ({ bot, onStartChat }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  console.log('[BotCard] Rendu de la carte pour:', bot.name, 'ID:', bot.id);

  const specialties = bot.specialties || getSpecialtiesFromContext(bot.chat_context).slice(0, 2);
  const rating = bot.rating || (4.5 + Math.random() * 0.4);
  const responseTime = bot.response_time || '< 2 min';
  const hasWebhook = bot.webhook_url && bot.webhook_url.trim() !== '';

  const handleStartChat = () => {
    console.log('[BotCard] Démarrage du chat avec interface standardisée:', bot.name, 'Webhook disponible:', hasWebhook);
    
    toast({
      title: "💬 Ouverture du chat",
      description: `Démarrage de ${bot.chat_title} avec interface identique au mode test`,
    });
    
    onStartChat(bot);
  };

  return (
    <Card 
      className={`bg-white border transition-all duration-300 cursor-pointer h-full ${
        isHovered 
          ? 'shadow-xl scale-[1.02] border-blue-300 bg-gradient-to-br from-white to-blue-50' 
          : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-12 h-12 bg-gradient-to-r rounded-full flex items-center justify-center transition-all duration-300 ${
              isHovered 
                ? 'from-blue-600 to-purple-700 scale-110' 
                : 'from-blue-500 to-purple-600'
            }`}>
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-gray-900 truncate">
              {bot.chat_title || bot.name}
            </CardTitle>
            <p className="text-sm text-gray-600 truncate">
              {bot.description}
            </p>
            {bot.owner_name && (
              <p className="text-xs text-gray-500">
                Par {bot.owner_name}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerte si pas de webhook */}
        {!hasWebhook && (
          <div className="flex items-center space-x-2 bg-orange-50 p-2 rounded">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-700">Configuration automatique</span>
          </div>
        )}

        {/* Statistiques */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="font-medium text-gray-900">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">{responseTime}</span>
          </div>
        </div>

        {/* Spécialités */}
        <div>
          <span className="text-sm text-gray-600 block mb-2">Spécialités</span>
          <div className="flex flex-wrap gap-1">
            {specialties.map((specialty, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`text-xs transition-colors ${
                  isHovered ? 'bg-blue-100 text-blue-700' : ''
                }`}
              >
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">En ligne</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Interface identique</span>
          </div>
        </div>

        {/* Bouton d'action */}
        <Button 
          onClick={handleStartChat}
          className={`w-full transition-all duration-300 ${
            isHovered 
              ? 'bg-blue-600 hover:bg-blue-700 transform scale-[1.02] shadow-lg' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Démarrer le chat
        </Button>
      </CardContent>
    </Card>
  );
};
