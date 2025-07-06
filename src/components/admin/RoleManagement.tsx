
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRoles } from '@/hooks/useRoles';
import { 
  Shield, 
  Plus, 
  Settings, 
  Crown, 
  Users, 
  Eye
} from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const { roles, permissions, isLoading, createRole } = useRoles();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const handleCreateRole = async () => {
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
      case 'viewer': return Eye;
      default: return Shield;
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'from-red-500 to-red-600';
      case 'manager': return 'from-blue-500 to-blue-600';
      case 'user': return 'from-green-500 to-green-600';
      case 'viewer': return 'from-gray-500 to-gray-600';
      default: return 'from-purple-500 to-purple-600';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des rôles</h2>
          <p className="text-gray-600 mt-1">
            Créez et gérez les rôles et leurs permissions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau rôle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau rôle</DialogTitle>
              <DialogDescription>
                Définissez un nouveau rôle pour organiser les permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nom du rôle</label>
                <Input
                  placeholder="Ex: Modérateur"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  placeholder="Décrivez le rôle et ses responsabilités"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateRole} disabled={!newRoleName.trim()}>
                  Créer le rôle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques des rôles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total rôles</p>
                <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rôles système</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roles.filter(r => r.is_system_role).length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rôles personnalisés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roles.filter(r => !r.is_system_role).length}
                </p>
              </div>
              <Plus className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Permissions</p>
                <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
              </div>
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des rôles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const RoleIcon = getRoleIcon(role.name);
          const roleColor = getRoleColor(role.name);
          
          return (
            <Card key={role.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${roleColor} rounded-lg flex items-center justify-center`}>
                      <RoleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      {role.is_system_role && (
                        <Badge variant="secondary" className="text-xs">
                          Système
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <CardDescription className="mb-4">
                  {role.description || 'Aucune description disponible'}
                </CardDescription>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Créé le:</span>
                    <span className="font-medium">
                      {new Date(role.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-1" />
                      Permissions
                    </Button>
                    {!role.is_system_role && (
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    )}
                  </div>
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
