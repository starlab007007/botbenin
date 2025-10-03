import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Shield, Mail, AlertCircle, CheckCircle } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface User {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

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

interface DiagnosticInfo {
  step: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
  timestamp: Date;
}

export const AdminUsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const { toast } = useToast();

  const addDiagnostic = (step: string, status: 'success' | 'error' | 'pending', message: string, data?: any) => {
    setDiagnostics(prev => [...prev, { step, status, message, data, timestamp: new Date() }]);
  };

  const fetchUsers = async () => {
    setDiagnostics([]);
    addDiagnostic('init', 'pending', 'Début de la récupération des utilisateurs');
    console.log('🔍 [AdminUsers] Fetching users...');
    
    // Vérifier l'authentification d'abord
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      addDiagnostic('session', 'error', 'Erreur lors de la récupération de la session', { error: sessionError });
      console.error('❌ [AdminUsers] Session error:', sessionError);
    } else if (!session) {
      addDiagnostic('session', 'error', 'Aucune session active - utilisateur non connecté');
      console.error('❌ [AdminUsers] No active session');
      toast({
        title: 'Erreur d\'authentification',
        description: 'Vous devez être connecté pour accéder à cette page',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    } else {
      addDiagnostic('session', 'success', 'Session authentifiée', {
        userId: session.user.id,
        email: session.user.email
      });
      console.log('✅ [AdminUsers] Session valid:', { 
        userId: session.user.id,
        email: session.user.email
      });
    }
    
    try {
      setLoading(true);
      
      addDiagnostic('function-call', 'pending', 'Appel de la fonction list-users-admin');
      console.log('📞 [AdminUsers] Calling list-users-admin function...');
      
      const { data, error } = await supabase.functions.invoke('list-users-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      console.log('📊 [AdminUsers] Response:', { 
        hasData: !!data, 
        dataKeys: data ? Object.keys(data) : [],
        error: error,
        rawData: JSON.stringify(data, null, 2)
      });
      
      if (error) {
        addDiagnostic('function-call', 'error', 'Erreur lors de l\'appel de la fonction', { 
          error: error.message,
          details: error 
        });
        console.error('❌ [AdminUsers] Error from function:', error);
        toast({
          title: 'Erreur',
          description: error.message || 'Erreur inconnue lors de la récupération des utilisateurs',
          variant: 'destructive',
        });
        setUsers([]);
        return;
      }

      if (!data) {
        addDiagnostic('function-call', 'error', 'Aucune donnée retournée par la fonction');
        console.error('⚠️ [AdminUsers] No data returned');
        toast({
          title: 'Avertissement',
          description: 'Aucune donnée retournée par le serveur',
        });
        setUsers([]);
        return;
      }

      if (!data.users) {
        addDiagnostic('function-call', 'error', 'Format de réponse invalide - pas de tableau users', { response: data });
        console.error('⚠️ [AdminUsers] No users array in response:', data);
        toast({
          title: 'Avertissement',
          description: 'Format de réponse invalide - aucun tableau users',
        });
        setUsers([]);
        return;
      }

      addDiagnostic('function-call', 'success', `${data.users.length} utilisateurs récupérés`, {
        usersCount: data.users.length,
        sampleUsers: data.users.slice(0, 3)
      });
      console.log('✅ [AdminUsers] Users received:', data.users.length);
      console.log('👥 [AdminUsers] Sample users:', data.users.slice(0, 3));
      
      const formattedUsers: User[] = data.users.map((u: any) => ({
        id: u.id,
        email: u.email || 'Sans email',
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
      }));
      
      setUsers(formattedUsers);
      addDiagnostic('formatting', 'success', `${formattedUsers.length} utilisateurs formatés avec succès`);
      
      toast({
        title: 'Succès',
        description: `${formattedUsers.length} utilisateur(s) chargé(s)`,
      });
      
      if (formattedUsers.length === 0) {
        addDiagnostic('result', 'error', 'Aucun utilisateur trouvé dans la base de données');
        console.log('⚠️ [AdminUsers] No users found in database');
      }
    } catch (error: any) {
      addDiagnostic('exception', 'error', 'Exception lors de la récupération', { 
        error: error.message,
        stack: error.stack 
      });
      console.error('💥 [AdminUsers] Exception:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les utilisateurs',
        variant: 'destructive',
      });
      setUsers([]);
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
      setUserRoles(data?.map((ur: UserRole) => ur.roles.id) || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleOpenUserDialog = async (user: User) => {
    setSelectedUser(user);
    await fetchUserRoles(user.id);
    setIsDialogOpen(true);
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
        <h1 className="text-4xl font-bold mb-2">Gestion des Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérer les utilisateurs et leurs rôles
        </p>
      </div>

      {/* Panneau de diagnostic */}
      <Card className="mb-6 border-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Diagnostic du Système
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              {showDiagnostics ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
        </CardHeader>
        {showDiagnostics && (
          <CardContent>
            <div className="space-y-3">
              {diagnostics.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Aucun diagnostic disponible</AlertTitle>
                  <AlertDescription>
                    Cliquez sur le bouton de rechargement pour lancer le diagnostic
                  </AlertDescription>
                </Alert>
              ) : (
                diagnostics.map((diag, index) => (
                  <Alert 
                    key={index} 
                    variant={diag.status === 'error' ? 'destructive' : 'default'}
                    className={diag.status === 'success' ? 'border-green-500' : ''}
                  >
                    <div className="flex items-start gap-3">
                      {diag.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                      {diag.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                      {diag.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                      <div className="flex-1">
                        <AlertTitle className="text-sm font-semibold mb-1">
                          {diag.step} - {diag.status}
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                          <div className="mb-2">{diag.message}</div>
                          {diag.data && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-medium">
                                Voir les détails
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(diag.data, null, 2)}
                              </pre>
                            </details>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {diag.timestamp.toLocaleTimeString()}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))
              )}
            </div>
            <Button 
              onClick={fetchUsers} 
              className="w-full mt-4"
              variant="outline"
            >
              Relancer le diagnostic
            </Button>
          </CardContent>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Liste des Utilisateurs ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
              {filteredUsers.length === 0 ? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenUserDialog(user)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Gérer Rôles
                    </Button>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
  );
};
