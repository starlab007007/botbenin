import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Settings, 
  Shield, 
  Eye, 
  Edit3, 
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Activity,
  Clock
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  subscription_tier: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
  language: string;
  timezone: string;
  avatar_url?: string;
  last_activity?: string;
  user_profiles?: {
    bio?: string;
    avatar_url?: string;
  };
  user_roles?: Array<{
    roles: {
      name: string;
    };
  }>;
  bot_owners?: Array<{
    subscription_plan: string;
    max_bots: number;
  }>;
}

interface UserStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  pending_users: number;
}

export const UsersManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    pending_users: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && hasPermission('manage_users')) {
      fetchUsers();
      fetchUserStats();
    }
  }, [currentUser]);

  const hasPermission = (permission: string) => {
    return currentUser?.permissions?.includes(permission) || false;
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            bio,
            avatar_url
          ),
          user_roles (
            roles (name)
          ),
          bot_owners (
            subscription_plan,
            max_bots
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform the data to match our User interface
        const transformedUsers: User[] = data.map(user => ({
          ...user,
          user_profiles: Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          is_active,
          user_roles (
            roles (name)
          )
        `);

      if (error) throw error;

      if (data) {
        const stats = {
          total_users: data.length,
          active_users: data.filter(u => u.is_active).length,
          admin_users: data.filter(u => 
            u.user_roles?.some(ur => ur.roles?.name === 'admin')
          ).length,
          pending_users: data.filter(u => !u.is_active).length
        };
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      // Enregistrer l'activité
      await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_activity_type: isActive ? 'account_activated' : 'account_deactivated',
        p_description: `Compte ${isActive ? 'activé' : 'désactivé'} par un administrateur`,
        p_metadata: { admin_id: currentUser?.id }
      });

      await fetchUsers();
      await fetchUserStats();

      toast({
        title: "Statut mis à jour",
        description: `L'utilisateur a été ${isActive ? 'activé' : 'désactivé'} avec succès`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Erreur",
        description: "Vous ne pouvez pas supprimer votre propre compte",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
      await fetchUserStats();

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const userRole = user.user_roles?.[0]?.roles?.name || 'user';
    const matchesRole = filterRole === 'all' || userRole === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
  };

  if (!hasPermission('manage_users')) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Gestion des utilisateurs</h1>
          <p className="text-gray-600">Gérez les utilisateurs, rôles et permissions de votre plateforme.</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total utilisateurs</h3>
              <div className="text-2xl font-bold text-gray-900">{userStats.total_users}</div>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Utilisateurs actifs</h3>
              <div className="text-2xl font-bold text-gray-900">{userStats.active_users}</div>
            </div>
            <Shield className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Administrateurs</h3>
              <div className="text-2xl font-bold text-gray-900">{userStats.admin_users}</div>
            </div>
            <Settings className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Inactifs</h3>
              <div className="text-2xl font-bold text-gray-900">{userStats.pending_users}</div>
            </div>
            <Eye className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="manager">Manager</option>
              <option value="user">Utilisateur</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>
          
          <Button variant="outline" className="border-gray-300 text-gray-700">
            <Filter className="w-4 h-4 mr-2" />
            Filtres avancés
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Liste des utilisateurs</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Rôle</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Dernière activité</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Abonnement</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.full_name || 'Nom non défini'}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <Phone className="w-3 h-3" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getRoleBadgeColor(user.user_roles?.[0]?.roles?.name || 'user')}>
                      {user.user_roles?.[0]?.roles?.name || 'user'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getStatusBadgeColor(user.is_active)}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-sm">
                        {user.last_activity ? 
                          new Date(user.last_activity).toLocaleDateString('fr-FR') : 
                          user.last_login ? 
                          new Date(user.last_login).toLocaleDateString('fr-FR') : 
                          'Jamais'
                        }
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-purple-100 text-purple-800">
                      {user.bot_owners?.[0]?.subscription_plan || user.subscription_tier || 'free'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm" className="p-2">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-2">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-2"
                        onClick={() => updateUserStatus(user.id, !user.is_active)}
                      >
                        <Activity className={`w-4 h-4 ${user.is_active ? 'text-red-600' : 'text-green-600'}`} />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-2 text-red-600 hover:text-red-700"
                          onClick={() => deleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
