import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Key, Plus, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

export const AdminPermissionsPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('detailed_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Convertir en format attendu
      const formattedData: Permission[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        resource: p.resource,
        action: p.action,
        created_at: p.created_at
      }));
      
      setPermissions(formattedData);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

      if (error) throw error;
      setRolePermissions(data?.map(rp => rp.permission_id) || []);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    } else {
      setRolePermissions([]);
    }
  }, [selectedRole]);

  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole) {
      toast({
        title: 'Attention',
        description: 'Sélectionnez d\'abord un rôle',
        variant: 'destructive',
      });
      return;
    }

    const hasPermission = rolePermissions.includes(permissionId);

    try {
      if (hasPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRole)
          .eq('permission_id', permissionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert([{ role_id: selectedRole, permission_id: permissionId }]);

        if (error) throw error;
      }

      fetchRolePermissions(selectedRole);
      toast({
        title: 'Succès',
        description: hasPermission ? 'Permission retirée' : 'Permission ajoutée',
      });
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la permission',
        variant: 'destructive',
      });
    }
  };

  const filteredPermissions = permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Gestion des Permissions</h1>
        <p className="text-muted-foreground">
          Attribuer des permissions aux rôles
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Sélectionner un rôle</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un rôle..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une permission..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {selectedRole && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>{rolePermissions.length}</strong> permission(s) active(s) pour ce rôle
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Object.keys(groupedPermissions).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Aucune permission trouvée</p>
                <p className="text-sm">
                  {searchTerm 
                    ? "Aucune permission ne correspond à votre recherche" 
                    : "Il n'y a pas encore de permissions configurées dans le système"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedPermissions).map(([resource, perms]) => (
          <Card key={resource}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {resource}
              </CardTitle>
              <CardDescription>{perms.length} permission(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perms.map((perm) => {
                  const hasPermission = rolePermissions.includes(perm.id);
                  return (
                    <div
                      key={perm.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        hasPermission
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleTogglePermission(perm.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{perm.name}</h4>
                        {hasPermission && (
                          <Badge variant="default" className="ml-2">
                            Actif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {perm.description || 'Aucune description'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )))}
      </div>
    </div>
  );
};
