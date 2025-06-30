
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBotOwnerData } from '@/hooks/useBotOwnerData';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database
} from 'lucide-react';

interface BotOwnerDataTestProps {
  onClose?: () => void;
}

export const BotOwnerDataTest: React.FC<BotOwnerDataTestProps> = ({ onClose }) => {
  const [testBotId, setTestBotId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [debugResult, setDebugResult] = useState<any>(null);

  const {
    botHistory,
    botStats,
    conversations,
    globalStats,
    historyLoading,
    statsLoading,
    conversationsLoading,
    globalStatsLoading,
    loadBotHistory,
    loadBotStats,
    loadConversations,
    loadGlobalStats,
    reloadAll,
    validateOwnership,
    debugBotAccess,
    error
  } = useBotOwnerData({ botId: testBotId, autoLoad: false });

  const handleTestBot = async () => {
    if (!testBotId.trim()) return;
    
    // Déboguer l'accès au bot
    const debug = await debugBotAccess(testBotId);
    setDebugResult(debug);
    
    // Si le bot est accessible, charger les données
    if (debug?.isOwner) {
      await Promise.all([
        loadBotHistory(testBotId),
        loadBotStats(testBotId),
        loadConversations(50, 0, testBotId)
      ]);
    }
  };

  const handleLoadGlobalStats = async () => {
    await loadGlobalStats();
  };

  const handleLoadConversations = async () => {
    await loadConversations();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              Test des Nouvelles Fonctionnalités Bot Owner
            </span>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Test d'un bot spécifique */}
            <div className="flex gap-2">
              <Input
                placeholder="ID du bot à tester"
                value={testBotId}
                onChange={(e) => setTestBotId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTestBot} disabled={!testBotId.trim()}>
                Tester le Bot
              </Button>
            </div>

            {/* Résultats du débogage */}
            {debugResult && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Résultat du Débogage</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {debugResult.isOwner ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>Propriétaire: {debugResult.isOwner ? 'Oui' : 'Non'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {debugResult.botExists ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>Bot existe: {debugResult.botExists ? 'Oui' : 'Non'}</span>
                  </div>
                  <div>
                    <span>Messages: {debugResult.historyCount}</span>
                  </div>
                  <div>
                    <span>Erreur: {debugResult.error || 'Aucune'}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Boutons d'actions globales */}
            <div className="flex gap-2">
              <Button 
                onClick={handleLoadGlobalStats} 
                disabled={globalStatsLoading}
                variant="outline"
              >
                {globalStatsLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Charger Stats Globales
              </Button>
              <Button 
                onClick={handleLoadConversations} 
                disabled={conversationsLoading}
                variant="outline"
              >
                {conversationsLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Charger Conversations
              </Button>
              <Button 
                onClick={reloadAll} 
                disabled={historyLoading || statsLoading}
                variant="outline"
              >
                Tout Recharger
              </Button>
            </div>

            {/* Messages d'erreur */}
            {error && (
              <Card className="p-4 border-red-200 bg-red-50">
                <p className="text-red-800 text-sm">{error}</p>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour afficher les résultats */}
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Stats Globales</TabsTrigger>
          <TabsTrigger value="bot">Stats Bot</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          {globalStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Total Bots</p>
                      <p className="text-2xl font-bold">{globalStats.total_bots}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Messages Total</p>
                      <p className="text-2xl font-bold">{globalStats.total_messages}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">Utilisateurs</p>
                      <p className="text-2xl font-bold">{globalStats.total_users}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-600">Actifs Aujourd'hui</p>
                      <p className="text-2xl font-bold">{globalStats.active_users_today}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">
                {globalStatsLoading ? 'Chargement...' : 'Cliquez sur "Charger Stats Globales" pour voir les données'}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bot" className="space-y-4">
          {botStats ? (
            <Card>
              <CardHeader>
                <CardTitle>{botStats.bot_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Messages Total</p>
                    <p>{botStats.total_messages}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Utilisateurs</p>
                    <p>{botStats.total_users}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Sessions</p>
                    <p>{botStats.total_sessions}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Messages 24h</p>
                    <p>{botStats.messages_24h}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Actifs 24h</p>
                    <p>{botStats.active_users_24h}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Moy. Msg/Session</p>
                    <p>{botStats.avg_messages_per_session}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Dernière activité: {formatDate(botStats.last_activity)}
                  </p>
                  <Badge variant={botStats.is_active ? "default" : "secondary"}>
                    {botStats.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">
                {statsLoading ? 'Chargement...' : 'Testez un bot spécifique pour voir ses statistiques'}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {botHistory.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {botHistory.map((message, index) => (
                <Card key={message.message_id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm">
                        <Badge variant={message.message_type === 'user' ? 'default' : 'secondary'}>
                          {message.message_type}
                        </Badge>
                        <span className="ml-2 font-semibold">{message.user_name}</span>
                      </p>
                      <p className="text-sm mt-1">{message.message_content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Session: {message.session_id} • {formatDate(message.message_timestamp)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">
                {historyLoading ? 'Chargement...' : 'Aucun message dans l\'historique'}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          {conversations.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {conversations.map((conv, index) => (
                <Card key={`${conv.bot_id}-${conv.session_id}`} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{conv.user_name}</p>
                      <p className="text-sm text-gray-600">{conv.bot_name}</p>
                      <p className="text-sm mt-1">
                        {conv.message_count} messages • 
                        <Badge variant={conv.is_active_today ? "default" : "secondary"} className="ml-2">
                          {conv.is_active_today ? 'Actif' : 'Inactif'}
                        </Badge>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Début: {formatDate(conv.conversation_start)} • 
                        Dernier: {formatDate(conv.last_message_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">
                {conversationsLoading ? 'Chargement...' : 'Aucune conversation trouvée'}
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
