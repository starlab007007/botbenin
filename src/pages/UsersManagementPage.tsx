import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  UserCheck,
  UserX,
  UserPlus,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { AdminControlPanel } from '@/components/AdminControlPanel';
import { AdminStats } from '@/components/AdminStats';
import { defaultAdminStats } from '@/types/admin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const UsersManagementPage: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, hasPermission } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return UserCheck;
      case 'inactive': return UserX;
      case 'pending': return UserPlus;
      default: return Users;
    }
  };

  const stats = [
    {
      title: 'Total utilisateurs',
      value: users.length,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: '+3 ce mois'
    },
    {
      title: 'Utilisateurs actifs',
      value: users.filter(u => u.status === 'active').length,
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      change: '98% du total'
    },
    {
      title: 'Administrateurs',
      value: users.filter(u => u.role === 'admin').length,
      icon: Crown,
      color: 'from-red-500 to-red-600',
      change: 'Accès complet'
    },
    {
      title: 'En attente',
      value: users.filter(u => u.status === 'pending').length,
      icon: AlertTriangle,
      color: 'from-yellow-500 to-yellow-600',
      change: 'À valider'
    }
  ];

  if (!hasPermission('manage_users') && !hasPermission('platform.admin')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900 mb-2">Accès restreint</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-600 mt-1">
            Gérez les utilisateurs, rôles et permissions de votre plateforme
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Statistiques globales pour admin */}
      {hasPermission('platform.admin') && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques de la plateforme</h2>
          <AdminStats stats={defaultAdminStats} isLoading={false} />
        </div>
      )}

      {/* Statistiques utilisateurs locales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs pour séparer gestion standard et administration */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Gestion des Utilisateurs</TabsTrigger>
          {hasPermission('platform.admin') && (
            <TabsTrigger value="admin" className="text-red-600">
              <Crown className="w-4 h-4 mr-2" />
              Administration
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Filtres et recherche */}
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
                <div className="relative w-full sm:w-80">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="viewer">Observateur</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Plus de filtres
              </Button>
            </div>
          </Card>

          {/* Liste des utilisateurs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Utilisateurs ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                Gérez les accès et permissions de vos utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Utilisateur</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Rôle</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Dernière connexion</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const StatusIcon = getStatusIcon(user.status);
                      return (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                user.role === 'admin' 
                                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
                              }`}>
                                {user.role === 'admin' ? (
                                  <Crown className="text-white font-semibold text-sm w-4 h-4" />
                                ) : (
                                  <span className="text-white font-semibold text-sm">
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="w-4 h-4 text-gray-500" />
                              <Badge className={getStatusBadgeColor(user.status)}>
                                {user.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : 'Jamais'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir le profil
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Permissions
                                </DropdownMenuItem>
                                {user.id !== currentUser?.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {hasPermission('platform.admin') && (
          <TabsContent value="admin">
            <AdminControlPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
