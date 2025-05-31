import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  History, 
  MessageSquare, 
  User, 
  Settings, 
  CreditCard,
  Bell,
  Clock,
  Eye,
  Trash2,
  Filter,
  Activity,
  Shield
} from 'lucide-react';

interface ChatHistory {
  id: string;
  bot_name: string;
  message_count: number;
  last_message: string;
  created_at: string;
}

interface AccountActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  ip_address: string | null;
  metadata: any;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface UserSession {
  id: string;
  session_token: string;
  last_activity: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
}

export const UserHistoryManagement: React.FC = () => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [accountActivities, setAccountActivities] = useState<AccountActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllHistory();
    }
  }, [user]);

  const fetchAllHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Récupérer l'historique des chats
      await fetchChatHistory();
      
      // Récupérer l'activité du compte
      await fetchAccountActivities();
      
      // Récupérer les notifications
      await fetchNotifications();
      
      // Récupérer les sessions
      await fetchUserSessions();

    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        started_at,
        total_messages,
        bot_id,
        bots (name)
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    if (sessions) {
      const formattedHistory: ChatHistory[] = [];
      
      for (const session of sessions) {
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('message_content')
          .eq('bot_id', session.bot_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        formattedHistory.push({
          id: session.id,
          bot_name: session.bots?.name || 'Bot supprimé',
          message_count: session.total_messages || 0,
          last_message: lastMessage?.message_content?.substring(0, 100) || 'Aucun message',
          created_at: session.started_at
        });
      }
      
      setChatHistory(formattedHistory);
    }
  };

  const fetchAccountActivities = async () => {
    const { data: activities } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (activities) {
      const formattedActivities: AccountActivity[] = activities.map(activity => ({
        id: activity.id,
        activity_type: activity.activity_type,
        description: activity.description || '',
        created_at: activity.created_at,
        ip_address: activity.ip_address ? String(activity.ip_address) : null,
        metadata: activity.metadata
      }));
      setAccountActivities(formattedActivities);
    }
  };

  const fetchNotifications = async () => {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifs) {
      setNotifications(notifs);
    }
  };

  const fetchUserSessions = async () => {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .order('last_activity', { ascending: false })
      .limit(20);

    if (sessions) {
      const formattedSessions: UserSession[] = sessions.map(session => ({
        id: session.id,
        session_token: session.session_token,
        last_activity: session.last_activity,
        ip_address: session.ip_address ? String(session.ip_address) : null,
        user_agent: session.user_agent,
        is_active: session.is_active,
        created_at: session.created_at
      }));
      setUserSessions(formattedSessions);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const terminateSession = async (sessionId: string) => {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    
    setUserSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, is_active: false }
          : session
      )
    );
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login': return <Shield className="w-4 h-4" />;
      case 'account_created': return <User className="w-4 h-4" />;
      case 'profile_updated': return <Settings className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Historique & Activité</h2>
        <p className="text-gray-600">Consultez votre activité et gérez vos notifications</p>
      </div>

      <Card className="uniform-card">
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="chats" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Conversations</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Activités</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="chats" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Historique des conversations
                  </h3>
                  <Button className="uniform-button-secondary" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrer
                  </Button>
                </div>
                
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune conversation trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.map((chat) => (
                      <div key={chat.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{chat.bot_name}</div>
                              <div className="text-sm text-gray-500">
                                {chat.message_count} messages
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(chat.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {chat.last_message}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="activities" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Activité du compte
                </h3>
                
                {accountActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accountActivities.map((activity) => (
                      <div key={activity.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{activity.activity_type}</div>
                              <div className="text-sm text-gray-500">
                                IP: {activity.ip_address || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(activity.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                        {activity.description && (
                          <p className="text-gray-600 text-sm">{activity.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Sessions actives
                  </h3>
                </div>
                
                {userSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune session trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userSessions.map((session) => (
                      <div key={session.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Shield className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Session {session.session_token.substring(0, 8)}...
                              </div>
                              <div className="text-sm text-gray-500">
                                IP: {session.ip_address || 'N/A'} • {session.user_agent?.substring(0, 50) || 'N/A'}...
                              </div>
                              <div className="text-xs text-gray-400">
                                Dernière activité: {new Date(session.last_activity).toLocaleString('fr-FR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {session.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {session.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => terminateSession(session.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Terminer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Notifications ({notifications.filter(n => !n.read).length} non lues)
                  </h3>
                  <Button className="uniform-button-secondary" size="sm">
                    Tout marquer comme lu
                  </Button>
                </div>
                
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune notification</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 rounded-lg border ${
                          notification.read 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-white border-gray-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <Badge className="uniform-badge bg-blue-100 text-blue-800">
                                  Nouveau
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-2">
                              {notification.content}
                            </p>
                            <div className="text-xs text-gray-500">
                              {new Date(notification.created_at).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="p-1"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};
