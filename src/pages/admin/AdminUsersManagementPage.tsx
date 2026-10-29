import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Shield, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserProfileModal } from '@/components/admin/UserProfileModal';
import { Eye, Edit, MoreVertical } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

import { loadAdminUsers, type AdminUser as User } from '@/lib/admin/users';

interface UserRole {
  role_id: string;
  roles: {
    id: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
}

export const AdminUsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setLoadError(null);
    const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), 30000);
    try {
      const result = await loadAdminUsers(controller.signal);
      if (activeRequest.current === controller) setUsers(result);
    } catch (error) {
      if (activeRequest.current !== controller) return;
      console.error('[AdminUsers] load failed', error);
      const message = error instanceof Error && /^(Reconnectez-vous|Vous ne pouvez pas)/.test(error.message)
        ? error.message : 'Impossible de charger les utilisateurs. Réessayez.';
      if (message.startsWith('Reconnectez-vous') || message.startsWith('Vous ne pouvez pas')) setUsers([]);
      setLoadError(message);
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) setLoading(false);
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

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles (
            id,
            name
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setUserRoles(data?.flatMap((ur: UserRole) => ur.roles?.id ? [ur.roles.id] : []) || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    return () => { activeRequest.current?.abort(); activeRequest.current = null; };
  }, []);

  const handleOpenUserDialog = async (user: User) => {
    setSelectedUser(user);
    await fetchUserRoles(user.id);
    setIsDialogOpen(true);
  };

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const handleToggleRole = async (roleId: string) => {
    if (!selectedUser) return;

    const hasRole = userRoles.includes(roleId);

    try {
      if (hasRole) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('role_id', roleId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: selectedUser.id, role_id: roleId }]);

        if (error) throw error;
      }

      await fetchUserRoles(selectedUser.id);
      toast({
        title: 'Succès',
        description: hasRole ? 'Rôle retiré' : 'Rôle attribué',
      });
    } catch (error) {
      console.error('Error toggling role:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le rôle',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PermissionGuard 
      permission="users.view"
      fallback={<Alert><AlertTitle>Accès restreint</AlertTitle><AlertDescription>Vous ne pouvez pas consulter cette liste.</AlertDescription></Alert>}
      fallbackMessage="Vous n'avez pas la permission de gérer les utilisateurs. Cette page est réservée aux administrateurs."
    >
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérer les utilisateurs et leurs rôles
          </p>
        </div>

      {loadError && (
        <Alert variant="destructive" className="mb-6" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chargement interrompu</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utilisateurs{!loading && !loadError ? ` (${filteredUsers.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Rechercher un utilisateur"
                placeholder="Rechercher un utilisateur…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loadError ? 'Réessayer' : 'Actualiser'}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8" role="status">Chargement des utilisateurs…</TableCell></TableRow>
              ) : loadError && users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">La liste n’a pas pu être chargée.</TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Aucun utilisateur trouvé</p>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm 
                        ? "Aucun utilisateur ne correspond à votre recherche" 
                        : "Il n'y a pas encore d'utilisateurs inscrits"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                      {user.email_confirmed_at ? 'Confirmé' : 'Non confirmé'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')
                      : 'Jamais'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Permissions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (
        <UserProfileModal
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          onUpdate={fetchUsers}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gérer les rôles</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {roles.map((role) => {
              const hasRole = userRoles.includes(role.id);
              return (
                <div
                  key={role.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    hasRole
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleToggleRole(role.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{role.name}</span>
                    {hasRole && <Badge variant="default">Actif</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  );
};
