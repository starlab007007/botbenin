
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserHistoryManagement } from '@/components/UserHistoryManagement';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { AccountOverview } from '@/components/account/AccountOverview';
import { SecuritySettings } from '@/components/account/SecuritySettings';
import { NotificationSettings } from '@/components/account/NotificationSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Settings, 
  Crown, 
  Shield, 
  History,
  Bell,
  Save,
  LayoutDashboard,
  Lock,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  subscription_tier: string;
  created_at: string;
  last_login: string | null;
}

interface BotOwnerInfo {
  subscription_plan: string;
  max_bots: number;
  created_at: string;
}

interface UserPermissions {
  role: string;
  permissions: string[];
}

export const AccountPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [botOwner, setBotOwner] = useState<BotOwnerInfo | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (authUser) {
      fetchUserProfile();
    }
  }, [authUser]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le profil utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erreur profil:', profileError);
      } else if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || ''
        });
      }

      // Récupérer les informations bot_owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('bot_owners')
        .select('subscription_plan, max_bots, created_at')
        .eq('user_id', user.id)
        .single();

      if (ownerError && ownerError.code !== 'PGRST116') {
        console.error('Erreur bot_owner:', ownerError);
      } else if (ownerData) {
        setBotOwner(ownerData);
      }

      // Récupérer les rôles et permissions
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name,
            role_permissions (
              detailed_permissions (name, action, resource)
            )
          )
        `)
        .eq('user_id', user.id);

      if (userRoles && userRoles.length > 0) {
        const role = userRoles[0].roles;
        const permissions = role.role_permissions?.map(rp => 
          `${rp.detailed_permissions.action}:${rp.detailed_permissions.resource}`
        ) || [];
        
        setUserPermissions({
          role: role.name,
          permissions
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du profil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!authUser) return;

    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchUserProfile();

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="p-4 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
        <Card className="uniform-card p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Veuillez vous connecter pour accéder à votre compte
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Header moderne avec profil */}
        <div className="relative">
          <Card className="overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
            
            <div className="relative p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                  {/* Avatar */}
                  <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                      {authUser?.name?.[0]?.toUpperCase() || authUser?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Infos utilisateur */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold tracking-tight">
                        {formData.full_name || authUser?.email?.split('@')[0] || 'Utilisateur'}
                      </h1>
                      <Badge variant="outline" className="capitalize">
                        <Shield className="w-3 h-3 mr-1" />
                        {userPermissions?.role || 'user'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                      {authUser?.email}
                      {authUser?.email && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>Membre depuis {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'N/A'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Crown className="w-4 h-4 text-primary" />
                        Plan {botOwner?.subscription_plan || 'free'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background/50 backdrop-blur rounded-lg border">
                    <div className="text-2xl font-bold text-primary">{botOwner?.max_bots || 0}</div>
                    <div className="text-xs text-muted-foreground">Bots max</div>
                  </div>
                  <div className="text-center p-3 bg-background/50 backdrop-blur rounded-lg border">
                    <div className="text-2xl font-bold text-primary">{userPermissions?.permissions.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Permissions</div>
                  </div>
                  <div className="text-center p-3 bg-background/50 backdrop-blur rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <div className="text-xs text-muted-foreground">Sécurité</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs modernes */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-muted/50 backdrop-blur border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
              <span className="sm:hidden">Vue</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="w-4 h-4 mr-2" />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Lock className="w-4 h-4 mr-2" />
              <span>Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Crown className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Abonnement</span>
              <span className="sm:hidden">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Permissions</span>
              <span className="sm:hidden">Accès</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notifs</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Historique</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="mt-0">
              <AccountOverview />
            </TabsContent>

            {/* Profil */}
            <TabsContent value="profile" className="mt-0 space-y-6">
              {/* Informations générales */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Informations personnelles
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gérez vos informations de compte
                    </p>
                  </div>
                  <Button 
                    onClick={updateProfile}
                    disabled={isUpdating}
                    size="lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom complet</label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Votre nom complet"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Email
                      <Badge variant="outline" className="text-xs">Vérifié</Badge>
                    </label>
                    <Input
                      value={authUser.email || ''}
                      disabled
                      className="h-11 bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+229 XX XX XX XX"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Membre depuis</label>
                    <Input
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      }) : 'N/A'}
                      disabled
                      className="h-11 bg-muted"
                    />
                  </div>
                </div>
              </Card>

              {/* Préférences */}
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Préférences du compte</h3>
                    <p className="text-sm text-muted-foreground">Personnalisez votre expérience</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Langue de l'interface</p>
                      <p className="text-sm text-muted-foreground">Français (France)</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Fuseau horaire</p>
                      <p className="text-sm text-muted-foreground">WAT (GMT+1)</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Sécurité */}
            <TabsContent value="security" className="mt-0">
              <SecuritySettings />
            </TabsContent>
            
            {/* Abonnement */}
            <TabsContent value="subscription" className="mt-0">
              <SubscriptionManagement />
            </TabsContent>

            {/* Permissions */}
            <TabsContent value="permissions" className="mt-0 space-y-6">
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Rôle et Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Votre niveau d'accès: <span className="font-semibold capitalize">{userPermissions?.role || 'user'}</span>
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Badge de rôle */}
                  <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Rôle actuel</p>
                        <h4 className="text-2xl font-bold capitalize">{userPermissions?.role || 'Non défini'}</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {userPermissions?.role === 'admin' && 'Accès complet à toutes les fonctionnalités'}
                          {userPermissions?.role === 'manager' && 'Gestion d\'équipe et accès business'}
                          {userPermissions?.role === 'user' && 'Accès aux fonctionnalités de base'}
                          {!userPermissions?.role && 'Niveau d\'accès standard'}
                        </p>
                      </div>
                      <Badge variant="default" className="text-base px-4 py-2">
                        {userPermissions?.permissions.length || 0} permissions
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Liste des permissions */}
                  {userPermissions?.permissions.length ? (
                    <div>
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Permissions actives
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {userPermissions.permissions.map((permission, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border">
                            <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium">{permission}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card className="p-6 bg-muted/30">
                      <p className="text-center text-muted-foreground">
                        Aucune permission spécifique attribuée
                      </p>
                    </Card>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="mt-0">
              <NotificationSettings />
            </TabsContent>

            {/* Historique */}
            <TabsContent value="history" className="mt-0">
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Historique d'activité</h3>
                    <p className="text-sm text-muted-foreground">Consultez vos conversations et actions</p>
                  </div>
                </div>
                <UserHistoryManagement />
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
