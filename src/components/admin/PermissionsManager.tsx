import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
  resource: string;
  action: string;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

export const PermissionsManager: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name, description, is_system_role')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Role[]; // Null fallback
    },
  });

  const { data: permissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detailed_permissions')
        .select('*')
        .order('category, name');
      if (error) throw error;
      return data as Permission[];
    },
  });

  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', selectedRole.id);
      if (error) throw error;
      return data.map(rp => rp.permission_id);
    },
    enabled: !!selectedRole,
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      // Supprimer toutes les permissions existantes pour ce rôle
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Ajouter les nouvelles permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(
            permissionIds.map(permissionId => ({
              role_id: roleId,
              permission_id: permissionId,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Succès",
        description: "Permissions mises à jour",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les permissions",
        variant: "destructive",
      });
    },
  });

  const groupedPermissions = permissions?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  const handleEditPermissions = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(rolePermissions || []);
    setIsEditDialogOpen(true);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'user_management': 'Gestion des Utilisateurs',
      'subscription_management': 'Gestion des Abonnements',
      'bot_management': 'Gestion des Bots',
      'analytics': 'Analytics et Rapports',
      'campaign_management': 'Gestion des Campagnes',
      'permission_management': 'Gestion des Permissions',
      'system': 'Administration Système',
    };
    return labels[category] || category;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Permissions</h1>
          <p className="text-gray-600 mt-1">Gérez les rôles et leurs permissions</p>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rôles et Permissions</h3>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rôle</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="font-medium">{role.display_name}</div>
                    <div className="text-sm text-gray-500">{role.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{role.description || 'Aucune description'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_system_role ? "default" : "outline"}>
                      {role.is_system_role ? 'Système' : 'Personnalisé'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rolePermissions?.length || 0} permissions
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPermissions(role)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier les Permissions - {selectedRole?.display_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-gray-900 border-b pb-2">
                  {getCategoryLabel(category)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() => handlePermissionToggle(permission.id)}
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={permission.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {permission.name}
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          {permission.description}
                        </p>
                        <div className="flex space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {permission.resource}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {permission.action}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (selectedRole) {
                    updateRolePermissionsMutation.mutate({
                      roleId: selectedRole.id,
                      permissionIds: selectedPermissions,
                    });
                  }
                }}
                disabled={updateRolePermissionsMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
