import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  Activity,
  Save,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserProfileModalProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_activity?: string;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  subscription_plans?: {
    name: string;
    price: number;
  };
}

interface UserRole {
  role_id: string;
  roles: {
    id: string;
    name: string;
    display_name: string;
  };
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  userEmail,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState('active');
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchUserData();
    }
  }, [open, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Récupérer le profil depuis public.users
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Si l'utilisateur n'existe pas dans public.users, essayer de le créer
      if (!profileData) {
        console.log('User not found in public.users, attempting to create...');
        
        // Récupérer les données depuis auth.users via l'edge function
        const { data: authUserData } = await supabase.functions.invoke('list-users-admin');
        
        if (authUserData?.users) {
          const authUser = authUserData.users.find((u: any) => u.id === userId);
          
          if (authUser) {
            // Créer l'utilisateur dans public.users
            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: authUser.email || userEmail,
                full_name: authUser.user_metadata?.full_name || 'Utilisateur',
                status: 'active'
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              throw new Error('Impossible de créer le profil utilisateur');
            }
            
            setProfile(newProfile);
            setFullName(newProfile.full_name || '');
            setStatus(newProfile.status || 'active');
          } else {
            throw new Error('Utilisateur non trouvé dans auth.users');
          }
        }
      } else {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setStatus(profileData.status || 'active');
      }

      // Récupérer l'abonnement
      const { data: subData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            price
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      setSubscription(subData);

      // Récupérer les rôles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles (
            id,
            name,
            display_name
          )
        `)
        .eq('user_id', userId);

      setRoles(rolesData || []);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données utilisateur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Profil mis à jour avec succès',
      });

      setEditMode(false);
      fetchUserData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil',
        variant: 'destructive',
      });
    }
  };

  const toggleUserStatus = async () => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setStatus(newStatus);
      toast({
        title: 'Succès',
        description: `Utilisateur ${newStatus === 'active' ? 'activé' : 'désactivé'}`,
      });
      onUpdate?.();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-8">
            Chargement...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Profil Utilisateur</DialogTitle>
              <DialogDescription>{userEmail}</DialogDescription>
            </div>
            {!editMode && (
              <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                Modifier
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="subscription">Abonnement</TabsTrigger>
            <TabsTrigger value="roles">Rôles & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-4">
              {/* Statut actif/inactif */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">Statut du compte</h3>
                    <p className="text-sm text-muted-foreground">
                      {status === 'active' ? 'Compte actif' : 'Compte désactivé'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={status === 'active'}
                  onCheckedChange={toggleUserStatus}
                  disabled={editMode}
                />
              </div>

              {/* Informations de base */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!editMode}
                      placeholder="Nom complet de l'utilisateur"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input value={profile?.email || ''} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de création</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={
                          profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                            : 'N/A'
                        }
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dernière activité</Label>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={
                          profile?.last_activity
                            ? new Date(profile.last_activity).toLocaleDateString('fr-FR')
                            : 'Jamais'
                        }
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>

              {editMode && (
                <div className="flex items-center gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMode(false);
                      setFullName(profile?.full_name || '');
                      setStatus(profile?.status || 'active');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            {subscription ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">
                      {subscription.subscription_plans?.name || 'Plan inconnu'}
                    </h3>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Prix mensuel</p>
                      <p className="font-semibold">
                        {subscription.subscription_plans?.price || 0} FCFA / mois
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Statut</p>
                      <p className="font-semibold capitalize">{subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Début période</p>
                      <p className="font-semibold">
                        {new Date(subscription.start_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fin période</p>
                      <p className="font-semibold">
                        {new Date(subscription.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Aucun abonnement actif</p>
                <p className="text-sm text-muted-foreground">
                  Cet utilisateur n'a pas d'abonnement en cours
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            {roles.length > 0 ? (
              <div className="space-y-3">
                {roles.map((userRole) => (
                  <div
                    key={userRole.role_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">
                          {userRole.roles.display_name || userRole.roles.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{userRole.roles.name}</p>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Aucun rôle attribué</p>
                <p className="text-sm text-muted-foreground">
                  Cet utilisateur n'a pas encore de rôle
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
