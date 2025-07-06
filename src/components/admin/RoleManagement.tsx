
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRoles } from '@/hooks/useRoles';
import { 
  Shield, 
  Plus, 
  MoreVertical, 
  Settings, 
  Users, 
  Key,
  Crown
} from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const { roles, permissions, isLoading, createRole, assignPermissionToRole, removePermissionFromRole } = useRoles();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    await createRole({
      name: newRoleName.trim(),
      description: newRoleDescription.trim()
    });

    setNewRoleName('');
    setNewRoleDescription('');
    setIsCreateDialogOpen(false);
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return Crown;
      case 'manager': return Shield;
      case 'user': return Users;
      case 'viewer': return Users;
      default: return Shield;
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Gestion des rôles ({roles.length})
              </CardTitle>
              <CardDescription>
                Créez et gérez les rôles et leurs permissions
              </CardDescription>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau rôle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau rôle</DialogTitle>
                  <DialogDescription>
                    Définissez un nouveau rôle avec ses permissions
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateRole}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="roleName" className="block text-sm font-medium mb-1">
                        Nom du rôle
                      </label>
                      <Input
                        id="roleName"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Ex: Modérateur"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="roleDescription" className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <Textarea
                        id="roleDescription"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        placeholder="Description du rôle et de ses responsabilités"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      Créer le rôle
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Liste des rôles */}
      <div className="space-y-4">
        {roles.map((role) => {
          const RoleIcon = getRoleIcon(role.name);
          return (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <RoleIcon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        <Badge className={getRoleBadgeColor(role.name)}>
                          {role.is_system_role ? 'Système' : 'Personnalisé'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                      <p className="text-xs text-gray-500">
                        Créé le: {new Date(role.created_at).toLocaleDateString('fr-FR')}
                      </p>
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
                        <Settings className="w-4 h-4 mr-2" />
                        Modifier le rôle
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Key className="w-4 h-4 mr-2" />
                        Gérer les permissions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!role.is_system_role && (
                        <DropdownMenuItem className="text-red-600">
                          <Settings className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900 mb-2">Aucun rôle</CardTitle>
            <CardDescription>
              Commencez par créer votre premier rôle personnalisé.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
