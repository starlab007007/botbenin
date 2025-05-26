
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, User, MessageSquare, Clock, Search, Filter } from 'lucide-react';

interface Bot {
  id: string;
  name: string;
}

interface BotUser {
  id: string;
  user_name: string;
  user_email: string;
  session_id: string;
  is_authenticated: boolean;
  created_at: string;
  last_active: string;
  bots: {
    name: string;
  };
  _count?: {
    messages: number;
  };
}

interface UserAnalyticsProps {
  bots: Bot[];
}

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({ bots }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<BotUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [userType, setUserType] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [selectedBot, userType]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('bot_users')
        .select(`
          id,
          user_name,
          user_email,
          session_id,
          is_authenticated,
          created_at,
          last_active,
          bots (
            name
          )
        `)
        .order('last_active', { ascending: false });

      if (selectedBot !== 'all') {
        query = query.eq('bot_id', selectedBot);
      }

      if (userType === 'authenticated') {
        query = query.eq('is_authenticated', true);
      } else if (userType === 'anonymous') {
        query = query.eq('is_authenticated', false);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Enrichir avec le nombre de messages pour chaque utilisateur
      const usersWithMessageCount = await Promise.all(
        (data || []).map(async (user) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('bot_user_id', user.id);

          return {
            ...user,
            _count: { messages: count || 0 }
          };
        })
      );

      setUsers(usersWithMessageCount);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      user.user_name?.toLowerCase().includes(searchTerm) ||
      user.user_email?.toLowerCase().includes(searchTerm) ||
      user.session_id?.toLowerCase().includes(searchTerm) ||
      user.bots?.name?.toLowerCase().includes(searchTerm)
    );
  });

  const stats = {
    total: filteredUsers.length,
    authenticated: filteredUsers.filter(u => u.is_authenticated).length,
    anonymous: filteredUsers.filter(u => !u.is_authenticated).length,
    totalMessages: filteredUsers.reduce((sum, u) => sum + (u._count?.messages || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Utilisateurs</h2>
          <p className="text-gray-600 mt-1">
            Analysez l'activité de vos utilisateurs
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rechercher
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Nom, email, session..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot
              </label>
              <Select value={selectedBot} onValueChange={setSelectedBot}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les bots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les bots</SelectItem>
                  {bots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'utilisateur
              </label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="authenticated">Authentifiés</SelectItem>
                  <SelectItem value="anonymous">Anonymes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total utilisateurs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">{stats.authenticated}</div>
                <div className="text-sm text-gray-600">Authentifiés</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">{stats.anonymous}</div>
                <div className="text-sm text-gray-600">Anonymes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                <div className="text-sm text-gray-600">Messages total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            {filteredUsers.length} utilisateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun utilisateur trouvé
              </h3>
              <p className="text-gray-600">
                Aucun utilisateur ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Utilisateur</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Bot</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Messages</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.user_name || user.user_email || 'Utilisateur anonyme'}
                          </div>
                          {user.user_email && user.user_name && (
                            <div className="text-sm text-gray-600">{user.user_email}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            Session: {user.session_id?.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900">
                          {user.bots?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.is_authenticated ? 'default' : 'secondary'}>
                          {user.is_authenticated ? 'Authentifié' : 'Anonyme'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {user._count?.messages || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(user.last_active).toLocaleString('fr-FR')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
