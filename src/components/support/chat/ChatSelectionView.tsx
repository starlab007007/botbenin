
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Shield, Users, Globe } from 'lucide-react';
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
  console.log('[ChatSelectionView] Rendu de la vue de sélection publique');
  console.log('[ChatSelectionView] Bots reçus:', liveChatBots?.length || 0);
  
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <MessageCircle className="w-16 h-16 text-blue-600 mr-4" />
          <Globe className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat IA Public 24/7</h1>
        <p className="text-gray-600 mb-2">Choisissez votre assistant IA et commencez une conversation instantanément</p>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            <Globe className="w-4 h-4" />
            <span>Accès libre</span>
          </div>
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            <Users className="w-4 h-4" />
            <span>Tous les utilisateurs</span>
          </div>
          <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
            <Shield className="w-4 h-4" />
            <span>Aucune connexion requise</span>
          </div>
        </div>
        
        {botsError && (
          <div className="mt-2 p-3 bg-red-100 text-red-800 rounded-lg border border-red-200">
            <p className="text-sm font-medium">Erreur de chargement :</p>
            <p className="text-sm">{botsError}</p>
          </div>
        )}
        
        {!botsLoading && liveChatBots && liveChatBots.length > 0 && (
          <div className="mt-2 p-2 bg-green-100 text-green-800 rounded">
            <p className="text-sm">
              ✅ {liveChatBots.length} assistant{liveChatBots.length > 1 ? 's' : ''} IA public{liveChatBots.length > 1 ? 's' : ''} disponible{liveChatBots.length > 1 ? 's' : ''}
            </p>
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
              <h3 className="text-lg font-semibold text-gray-900">Assistants IA publics - Accessible à tous</h3>
              <div className="flex items-center space-x-2 text-blue-600">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">100% Public</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-500" />
                  Support Technique
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Configuration des systèmes</li>
                  <li>• Résolution de problèmes</li>
                  <li>• Guides techniques</li>
                  <li>• Dépannage en temps réel</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-500" />
                  Conseil Business
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Stratégie d'entreprise</li>
                  <li>• Optimisation des processus</li>
                  <li>• Analyse de performance</li>
                  <li>• Recommandations personnalisées</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-purple-500" />
                  Assistance Marketing
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Campagnes publicitaires</li>
                  <li>• Création de contenu</li>
                  <li>• Analyse d'audience</li>
                  <li>• Stratégies de croissance</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-700">
                <strong>🚀 Accès libre :</strong> Tous ces assistants IA sont accessibles sans inscription, 
                que vous soyez connecté ou non. Commencez votre conversation en un clic !
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
