
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useRoles } from '@/hooks/useRoles';
import { Shield, Plus, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const RoleManagement: React.FC = () => {
  const { roles, permissions, isLoading, createRole, assignPermissionToRole, removePermissionFromRole } = useRoles();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestion des Rôles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateRole = async () => {
    if (newRole.name.trim() && newRole.description.trim()) {
      await createRole(newRole);
      setNewRole({ name: '', description: '' });
      setIsCreateDialogOpen(false);
    }
  };

  const handlePermissionToggle = async (roleId: string, permissionId: string, hasPermission: boolean) => {
    if (hasPermission) {
      await removePermissionFromRole(roleId, permissionId);
    } else {
      await assignPermissionToRole(roleId, permissionId);
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Gestion des Rôles</span>
              </CardTitle>
              <CardDescription>
                Créer et gérer les rôles et leurs permissions
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau Rôle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau rôle</DialogTitle>
                  <DialogDescription>
                    Définissez le nom et la description du nouveau rôle
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nom du rôle</Label>
                    <Input
                      id="name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      placeholder="Ex: moderator"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      placeholder="Description du rôle..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateRole}
                    disabled={!newRole.name.trim() || !newRole.description.trim()}
                  >
                    Créer le rôle
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {roles.map((role) => (
              <Card key={role.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg capitalize">{role.name}</CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </div>
                    {role.is_system_role && (
                      <Badge variant="secondary">Système</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-900 capitalize">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {categoryPermissions.map((permission) => {
                            const hasPermission = role.permissions?.some(p => p.id === permission.id) || false;
                            return (
                              <div
                                key={permission.id}
                                className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                                  hasPermission 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                                onClick={() => handlePermissionToggle(role.id, permission.id, hasPermission)}
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{permission.name}</div>
                                  <div className="text-xs text-gray-500">{permission.description}</div>
                                </div>
                                {hasPermission ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <X className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
