
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
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
  Filter
} from 'lucide-react';

interface ChatHistory {
  id: string;
  bot_name: string;
  message_count: number;
  last_message: string;
  created_at: string;
}

interface AccountHistory {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  ip_address: string;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const UserHistoryManagement: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [accountHistory, setAccountHistory] = useState<AccountHistory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllHistory();
  }, []);

  const fetchAllHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer l'historique des chats
      await fetchChatHistory(user.id);
      
      // Récupérer l'historique du compte
      await fetchAccountHistory(user.id);
      
      // Récupérer les notifications
      await fetchNotifications(user.id);

    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async (userId: string) => {
    // Récupérer les sessions de chat via bot_users
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        started_at,
        total_messages,
        bots (name),
        chat_messages (message_content)
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    if (sessions) {
      const formattedHistory: ChatHistory[] = sessions.map(session => ({
        id: session.id,
        bot_name: session.bots?.name || 'Bot supprimé',
        message_count: session.total_messages || 0,
        last_message: session.chat_messages?.[0]?.message_content?.substring(0, 100) || 'Aucun message',
        created_at: session.started_at
      }));
      
      setChatHistory(formattedHistory);
    }
  };

  const fetchAccountHistory = async (userId: string) => {
    const { data: history } = await supabase
      .from('access_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (history) {
      const formattedHistory: AccountHistory[] = history.map(log => ({
        id: log.id,
        action: log.action,
        details: JSON.stringify(log.details),
        timestamp: log.timestamp,
        ip_address: log.ip_address
      }));
      
      setAccountHistory(formattedHistory);
    }
  };

  const fetchNotifications = async (userId: string) => {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifs) {
      setNotifications(notifs);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Historique & Notifications</h2>
        <p className="text-gray-600">Consultez votre activité et gérez vos notifications</p>
      </div>

      <Card className="uniform-card">
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="chats" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Historique Chats</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Activité Compte</span>
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
            
            <TabsContent value="account" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Activité du compte
                </h3>
                
                {accountHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accountHistory.map((log) => (
                      <div key={log.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Clock className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{log.action}</div>
                              <div className="text-sm text-gray-500">IP: {log.ip_address}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">{log.details}</p>
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
