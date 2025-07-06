
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useRoles } from '@/hooks/useRoles';
import { Users, Shield, UserCheck, UserX, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const UserManagement: React.FC = () => {
  const { users, isLoading, assignRole, removeRole } = useAdminUsers();
  const { roles } = useRoles();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestion des Utilisateurs</CardTitle>
            <CardDescription>
              Gérer les rôles et permissions des utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-orange-100 text-orange-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRoleChange = async (userId: string, roleId: string, action: 'add' | 'remove') => {
    if (action === 'add') {
      await assignRole(userId, roleId);
    } else {
      await removeRole(userId, roleId);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Gestion des Utilisateurs</span>
          </CardTitle>
          <CardDescription>
            Gérer les rôles et permissions des utilisateurs de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500">
                        Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex space-x-2 mt-2">
                        {user.roles.map((role) => (
                          <Badge
                            key={role.id}
                            className={getRoleBadgeColor(role.name)}
                          >
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      {user.permissions.length} permissions
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {roles.map((role) => {
                          const hasRole = user.roles.some(userRole => userRole.id === role.id);
                          return (
                            <DropdownMenuItem
                              key={role.id}
                              onClick={() => handleRoleChange(
                                user.id,
                                role.id,
                                hasRole ? 'remove' : 'add'
                              )}
                            >
                              {hasRole ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Retirer {role.name}
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Ajouter {role.name}
                                </>
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-gray-500">Total utilisateurs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.roles.some(r => r.name === 'admin')).length}
                </div>
                <div className="text-sm text-gray-500">Administrateurs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.roles.some(r => r.name === 'manager')).length}
                </div>
                <div className="text-sm text-gray-500">Gestionnaires</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-600" />
              <div>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.roles.some(r => r.name === 'user')).length}
                </div>
                <div className="text-sm text-gray-500">Utilisateurs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
