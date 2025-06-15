import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Edit, Trash2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_login: string;
  is_active: boolean;
  subscription_tier: string;
  status: string;
  role_name?: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
}

export const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          created_at,
          last_login,
          is_active,
          subscription_tier,
          status
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as User[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name')
        .eq('is_system_role', true); // Only system roles for dropdown
      if (error) throw error;
      return (data ?? []) as Role[];
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Succès",
        description: "Statut utilisateur mis à jour",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      // Supprimer les anciens rôles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Assigner le nouveau rôle
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsRoleDialogOpen(false);
      toast({
        title: "Succès",
        description: "Rôle utilisateur mis à jour",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le rôle",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive || status === 'suspended') {
      return <Badge variant="destructive">Suspendu</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="default">Actif</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getSubscriptionBadge = (tier: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      premium: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <Badge className={colors[tier as keyof typeof colors] || colors.free}>
        {tier}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les comptes utilisateurs et leurs permissions</p>
        </div>
        <Button className="flex items-center space-x-2">
          <UserPlus className="w-4 h-4" />
          <span>Nouvel Utilisateur</span>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par email ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Dernière Connexion</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.role_name || 'Utilisateur'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status, user.is_active)}
                  </TableCell>
                  <TableCell>
                    {getSubscriptionBadge(user.subscription_tier)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('fr-FR')
                        : 'Jamais'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifier le Rôle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                Utilisateur: {selectedUser?.full_name}
                              </p>
                              <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles?.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.display_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => setIsRoleDialogOpen(false)}
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={() => {
                                  if (selectedUser && selectedRole) {
                                    assignRoleMutation.mutate({
                                      userId: selectedUser.id,
                                      roleId: selectedRole,
                                    });
                                  }
                                }}
                                disabled={!selectedRole || assignRoleMutation.isPending}
                              >
                                Assigner
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newStatus = user.status === 'active' ? 'suspended' : 'active';
                          updateUserStatusMutation.mutate({
                            userId: user.id,
                            status: newStatus,
                          });
                        }}
                        disabled={updateUserStatusMutation.isPending}
                      >
                        {user.status === 'active' ? 'Suspendre' : 'Activer'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
