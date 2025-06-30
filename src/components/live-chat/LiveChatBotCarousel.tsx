
import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { BotCard } from './BotCard';
import { BotLoadingSkeleton } from './BotLoadingSkeleton';
import { BotCarouselHeader } from './BotCarouselHeader';
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
  // DIAGNOSTIC COMPLET
  console.log('[LiveChatBotCarousel] === DIAGNOSTIC AFFICHAGE ===');
  console.log('[LiveChatBotCarousel] Props reçues:', {
    botsCount: bots?.length || 0,
    isLoading,
    hasOnRefresh: !!onRefresh,
    botsArray: bots
  });

  console.log('[LiveChatBotCarousel] Détails des bots reçus:');
  if (bots && bots.length > 0) {
    bots.forEach((bot, index) => {
      console.log(`[LiveChatBotCarousel] Bot ${index + 1}:`, {
        id: bot.id,
        name: bot.name,
        description: bot.description?.substring(0, 50) + '...',
        hasWebhook: !!bot.webhook_url,
        webhookUrl: bot.webhook_url,
        context: bot.chat_context,
        isActive: bot.is_active,
        chatTitle: bot.chat_title
      });
    });
  } else {
    console.log('[LiveChatBotCarousel] PROBLÈME: Aucun bot dans le tableau !');
  }

  if (isLoading) {
    console.log('[LiveChatBotCarousel] AFFICHAGE: État de chargement');
    return <BotLoadingSkeleton />;
  }

  if (!bots || bots.length === 0) {
    console.log('[LiveChatBotCarousel] AFFICHAGE: Aucun bot - NoBotAvailable');
    return (
      <NoBotAvailable 
        onRefresh={onRefresh || (() => {
          console.log('[LiveChatBotCarousel] Refresh demandé mais pas de fonction onRefresh');
        })} 
        isLoading={false} 
      />
    );
  }

  console.log('[LiveChatBotCarousel] AFFICHAGE: Rendu de', bots.length, 'bots');

  return (
    <div className="w-full">
      <BotCarouselHeader botCount={bots.length} />

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
