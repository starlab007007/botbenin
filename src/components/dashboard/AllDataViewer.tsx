
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Users, 
  Activity, 
  Database,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';

interface AllDataViewerProps {
  onClose: () => void;
}

export const AllDataViewer: React.FC<AllDataViewerProps> = ({ onClose }) => {
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allStats, setAllStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get bot owner ID
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      // Get all bots for this owner
      const { data: botsData } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerData.id);

      const botIds = botsData?.map(bot => bot.id) || [];

      if (botIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch all messages
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select(`
          *,
          bot_users (user_name, user_email, session_id),
          bots (name)
        `)
        .in('bot_id', botIds)
        .order('created_at', { ascending: false })
        .limit(500);

      setAllMessages(messagesData || []);

      // Fetch all enhanced sessions
      const { data: enhancedSessions } = await supabase
        .from('enhanced_chat_sessions')
        .select(`
          *,
          bot_users (user_name, user_email),
          bots (name)
        `)
        .in('bot_id', botIds)
        .order('started_at', { ascending: false });

      // Fetch all anonymous sessions
      const { data: anonymousSessions } = await supabase
        .from('anonymous_visitor_sessions')
        .select(`
          *,
          bots (name)
        `)
        .in('bot_id', botIds)
        .order('started_at', { ascending: false });

      const combinedSessions = [
        ...(enhancedSessions || []).map(s => ({ ...s, session_type: 'enhanced' })),
        ...(anonymousSessions || []).map(s => ({ ...s, session_type: 'anonymous' }))
      ];

      setAllSessions(combinedSessions);

      // Fetch all bot users
      const { data: usersData } = await supabase
        .from('bot_users')
        .select(`
          *,
          bots (name)
        `)
        .in('bot_id', botIds)
        .order('created_at', { ascending: false });

      setAllUsers(usersData || []);

      // Calculate comprehensive stats
      const stats = {
        totalMessages: messagesData?.length || 0,
        userMessages: messagesData?.filter(m => m.message_type === 'user').length || 0,
        botMessages: messagesData?.filter(m => m.message_type === 'bot').length || 0,
        totalSessions: combinedSessions.length,
        enhancedSessions: enhancedSessions?.length || 0,
        anonymousSessions: anonymousSessions?.length || 0,
        totalUsers: usersData?.length || 0,
        authenticatedUsers: usersData?.filter(u => u.is_authenticated).length || 0,
        anonymousUsers: usersData?.filter(u => !u.is_authenticated).length || 0,
        totalBots: botIds.length
      };

      setAllStats(stats);

    } catch (error) {
      console.error('Error fetching all data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = (data: any[], filename: string) => {
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(item => 
        Object.values(item).map(value => 
          typeof value === 'object' ? JSON.stringify(value) : String(value)
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold">Chargement de toutes les données...</h3>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Toutes les données - Vue complète</h2>
            <p className="text-gray-600">Messages, sessions, utilisateurs et statistiques</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={onClose} variant="outline">
              Fermer
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{allStats.totalMessages}</div>
              <div className="text-sm text-blue-700">Messages Total</div>
              <div className="text-xs text-blue-600 mt-1">
                {allStats.userMessages} utilisateur • {allStats.botMessages} bot
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{allStats.totalSessions}</div>
              <div className="text-sm text-green-700">Sessions Total</div>
              <div className="text-xs text-green-600 mt-1">
                {allStats.enhancedSessions} avancées • {allStats.anonymousSessions} anonymes
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{allStats.totalUsers}</div>
              <div className="text-sm text-purple-700">Utilisateurs Total</div>
              <div className="text-xs text-purple-600 mt-1">
                {allStats.authenticatedUsers} auth • {allStats.anonymousUsers} anonymes
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Database className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-900">{allStats.totalBots}</div>
              <div className="text-sm text-orange-700">Bots Actifs</div>
            </div>
          </div>
        </div>

        {/* Data Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="messages" className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="messages">Messages ({allStats.totalMessages})</TabsTrigger>
              <TabsTrigger value="sessions">Sessions ({allStats.totalSessions})</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs ({allStats.totalUsers})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages" className="flex-1 mx-6 mb-6 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Tous les messages</h3>
                  <Button onClick={() => exportData(allMessages, 'messages')} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter CSV
                  </Button>
                </div>
                <div className="flex-1 overflow-auto border rounded-lg">
                  <div className="space-y-2 p-4">
                    {allMessages.map((message, index) => (
                      <div key={message.id || index} className="p-3 border rounded bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              message.message_type === 'user' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {message.message_type}
                            </span>
                            <span className="font-medium">
                              {message.bot_users?.user_name || 'Utilisateur anonyme'}
                            </span>
                            <span className="text-sm text-gray-500">
                              • {message.bots?.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-gray-700">{message.message_content}</p>
                        {message.bot_users?.session_id && (
                          <div className="text-xs text-gray-500 mt-2">
                            Session: {message.bot_users.session_id.slice(0, 20)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="flex-1 mx-6 mb-6 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Toutes les sessions</h3>
                  <Button onClick={() => exportData(allSessions, 'sessions')} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter CSV
                  </Button>
                </div>
                <div className="flex-1 overflow-auto border rounded-lg">
                  <div className="space-y-2 p-4">
                    {allSessions.map((session, index) => (
                      <div key={session.id || index} className="p-3 border rounded bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              session.session_type === 'enhanced' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {session.session_type}
                            </span>
                            <span className="font-medium">
                              {session.bot_users?.user_name || 'Session anonyme'}
                            </span>
                            <span className="text-sm text-gray-500">
                              • {session.bots?.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(session.started_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Token: {session.session_token?.slice(0, 20)}...</div>
                          <div>Messages: {session.total_messages || session.total_interactions || 0}</div>
                          <div>Point d'entrée: {session.entry_point}</div>
                          <div>Actif: {session.is_active ? 'Oui' : 'Non'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="flex-1 mx-6 mb-6 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Tous les utilisateurs</h3>
                  <Button onClick={() => exportData(allUsers, 'users')} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter CSV
                  </Button>
                </div>
                <div className="flex-1 overflow-auto border rounded-lg">
                  <div className="space-y-2 p-4">
                    {allUsers.map((user, index) => (
                      <div key={user.id || index} className="p-3 border rounded bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.is_authenticated 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.is_authenticated ? 'Authentifié' : 'Anonyme'}
                            </span>
                            <span className="font-medium">
                              {user.user_name || 'Utilisateur sans nom'}
                            </span>
                            <span className="text-sm text-gray-500">
                              • {user.bots?.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(user.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Email: {user.user_email || 'Non fourni'}</div>
                          <div>Session: {user.session_id?.slice(0, 20)}...</div>
                          <div>Dernière activité: {user.last_active ? new Date(user.last_active).toLocaleString('fr-FR') : 'Inconnue'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};
