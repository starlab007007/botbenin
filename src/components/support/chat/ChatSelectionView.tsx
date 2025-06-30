
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Shield } from 'lucide-react';
import { LiveChatBotCarousel } from '@/components/live-chat/LiveChatBotCarousel';

interface ChatSelectionViewProps {
  liveChatBots: any[] | null;
  botsLoading: boolean;
  botsError: string | null;
  onStartChat: (bot: any) => void;
  onRefreshBots: () => void;
}

export const ChatSelectionView: React.FC<ChatSelectionViewProps> = ({
  liveChatBots,
  botsLoading,
  botsError,
  onStartChat,
  onRefreshBots
}) => {
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
          onStartChat={onStartChat}
          isLoading={botsLoading}
          onRefresh={onRefreshBots}
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
};
