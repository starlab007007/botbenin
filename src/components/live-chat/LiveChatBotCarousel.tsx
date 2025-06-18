
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Bot, Star, Clock, MessageCircle, Users, Zap } from 'lucide-react';
import { NoBotAvailable } from './NoBotAvailable';

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

interface LiveChatBotCarouselProps {
  bots: LiveChatBot[];
  onStartChat: (bot: LiveChatBot) => void;
  isLoading: boolean;
  onRefresh?: () => void;
}

export const LiveChatBotCarousel: React.FC<LiveChatBotCarouselProps> = ({
  bots,
  onStartChat,
  isLoading,
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white border border-gray-200 animate-pulse">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gray-300 rounded w-32"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                  <div className="h-8 bg-gray-300 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!bots || bots.length === 0) {
    return (
      <NoBotAvailable 
        onRefresh={onRefresh || (() => {})} 
        isLoading={isLoading} 
      />
    );
  }

  return (
    <div className="w-full">
      {/* Indicateur du nombre de bots disponibles */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
          <Zap className="w-4 h-4" />
          <span className="font-medium">
            {bots.length} assistant{bots.length > 1 ? 's' : ''} IA disponible{bots.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {bots.length <= 3 ? (
        // Affichage en grille si 3 bots ou moins
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onStartChat={onStartChat} />
          ))}
        </div>
      ) : (
        // Carrousel si plus de 3 bots
        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {bots.map((bot) => (
              <CarouselItem key={bot.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <BotCard bot={bot} onStartChat={onStartChat} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      )}
    </div>
  );
};

interface BotCardProps {
  bot: LiveChatBot;
  onStartChat: (bot: LiveChatBot) => void;
}

const BotCard: React.FC<BotCardProps> = ({ bot, onStartChat }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getSpecialtiesFromContext = (context: string): string[] => {
    const contextMap: Record<string, string[]> = {
      'technical': ['Support Technique', 'Dépannage', 'Configuration'],
      'business': ['Conseil Business', 'Stratégie', 'Optimisation'],
      'marketing': ['Marketing IA', 'Campagnes', 'Analytics'],
      'customer_service': ['Service Client', 'Support', 'Assistance'],
      'sales': ['Vente', 'Conversion', 'Lead Generation'],
      'general': ['Assistance Générale', 'Polyvalent', 'Support'],
      'automation': ['Automatisation', 'Workflow', 'Intégrations']
    };
    
    return contextMap[context] || ['IA Conversationnelle', 'Support 24/7'];
  };

  const specialties = bot.specialties || getSpecialtiesFromContext(bot.chat_context).slice(0, 2);
  const rating = bot.rating || (4.5 + Math.random() * 0.4); // Rating entre 4.5 et 4.9
  const responseTime = bot.response_time || '< 1 min';

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
              {bot.description || 'Assistant IA intelligent'}
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
            <span className="text-xs text-gray-500">Disponible maintenant</span>
          </div>
        </div>

        {/* Bouton d'action */}
        <Button 
          onClick={() => onStartChat(bot)}
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
