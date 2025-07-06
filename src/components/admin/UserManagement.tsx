
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useRoles } from '@/hooks/useRoles';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserCheck, 
  UserX, 
  Settings,
  Crown
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { users, isLoading, assignRole, removeRole } = useAdminUsers();
  const { roles } = useRoles();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || 
      user.roles.some(role => role.name === filterRole);
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return Crown;
      case 'manager': return Shield;
      case 'user': return UserCheck;
      case 'viewer': return UserX;
      default: return Users;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header et filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Gestion des utilisateurs ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Gérez les utilisateurs et leurs rôles sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Plus de filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.email.split('@')[0].substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{user.email}</h3>
                      {user.roles.map((role) => {
                        const RoleIcon = getRoleIcon(role.name);
                        return (
                          <Badge key={role.id} className={getRoleBadgeColor(role.name)}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {role.name}
                          </Badge>
                        );
                      })}
                    </div>
                    
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Créé le: {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                      <p>Permissions: {user.permissions.length}</p>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Voir les détails
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Gérer les rôles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <UserX className="w-4 h-4 mr-2" />
                      Suspendre
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Permissions de l'utilisateur */}
              {user.permissions.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions actives:</h4>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.slice(0, 6).map((permission, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {permission.name}
                      </Badge>
                    ))}
                    {user.permissions.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{user.permissions.length - 6} autres
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900 mb-2">Aucun utilisateur</CardTitle>
            <CardDescription>
              Aucun utilisateur ne correspond aux critères de recherche.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
