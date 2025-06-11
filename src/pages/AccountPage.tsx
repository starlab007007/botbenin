import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserHistoryManagement } from '@/components/UserHistoryManagement';
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
  CreditCard,
  Key,
  Save,
  Edit3,
  Phone,
  Mail,
  Calendar,
  Activity
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  subscription_tier: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  language: string;
  timezone: string;
  avatar_url: string | null;
}

interface UserStats {
  total_bots: number;
  total_messages: number;
  total_automations: number;
  unread_notifications: number;
  role_name: string;
}

interface BotOwner {
  subscription_plan: string;
  max_bots: number;
}

export const AccountPage: React.FC = () => {
  const { user: authUser, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [botOwner, setBotOwner] = useState<BotOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    language: 'fr',
    timezone: 'UTC'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (authUser) {
      fetchUserProfile();
      fetchUserStats();
    }
  }, [authUser]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le profil utilisateur complet
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            bio,
            avatar_url,
            preferences,
            social_links
          ),
          bot_owners (
            subscription_plan,
            max_bots
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erreur profil:', profileError);
      } else if (profileData) {
        setProfile(profileData);
        
        // Set bot owner data safely
        if (profileData.bot_owners && Array.isArray(profileData.bot_owners) && profileData.bot_owners.length > 0) {
          setBotOwner(profileData.bot_owners[0]);
        } else {
          // Set default bot owner data if none exists
          setBotOwner({
            subscription_plan: 'free',
            max_bots: 1
          });
        }
        
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          bio: profileData.user_profiles?.[0]?.bio || '',
          language: profileData.language || 'fr',
          timezone: profileData.timezone || 'UTC'
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

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', user.id)
        .single();

      if (stats) {
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const updateUserProfile = async () => {
    if (!authUser) return;

    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mettre à jour la table users
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          language: formData.language,
          timezone: formData.timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Mettre à jour ou créer le profil étendu
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Enregistrer l'activité de mise à jour
      await supabase.rpc('log_user_activity', {
        p_user_id: user.id,
        p_activity_type: 'profile_updated',
        p_description: 'Profil utilisateur mis à jour',
        p_metadata: { 
          updated_fields: Object.keys(formData).filter(key => 
            formData[key as keyof typeof formData] !== ''
          )
        }
      });

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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Mon Compte - {userStats?.role_name || authUser.role}
        </h1>
        <p className="text-gray-600">
          Gérez vos informations personnelles et votre abonnement
        </p>
      </div>

      <Card className="uniform-card">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Abonnement</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Historique</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="profile" className="mt-0 space-y-6">
              {/* Informations générales */}
              <Card className="uniform-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Informations personnelles
                  </h3>
                  <Button 
                    onClick={updateUserProfile}
                    disabled={isUpdating}
                    className="uniform-button-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isUpdating ? 'Mise à jour...' : 'Sauvegarder'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Nom complet
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Votre nom complet"
                      className="uniform-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </label>
                    <Input
                      value={authUser.email || ''}
                      disabled
                      className="uniform-input bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Téléphone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+229 XX XX XX XX"
                      className="uniform-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Membre depuis
                    </label>
                    <Input
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      disabled
                      className="uniform-input bg-gray-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Biographie
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Parlez-nous de vous..."
                      className="uniform-input min-h-[100px]"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langue
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                      className="uniform-input"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuseau horaire
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="uniform-input"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Africa/Porto-Novo">Afrique/Porto-Novo</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Statistiques du compte */}
              <Card className="uniform-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <Activity className="w-5 h-5 inline mr-2" />
                  Résumé du compte
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {userStats?.total_bots || 0}
                    </div>
                    <div className="text-sm text-gray-600">Chatbots</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {userStats?.total_messages || 0}
                    </div>
                    <div className="text-sm text-gray-600">Messages</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {userStats?.total_automations || 0}
                    </div>
                    <div className="text-sm text-gray-600">Automations</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {userStats?.unread_notifications || 0}
                    </div>
                    <div className="text-sm text-gray-600">Notifications</div>
                  </div>
                </div>
              </Card>

              {/* Status du compte */}
              <Card className="uniform-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Status du compte
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge className={`${profile?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {profile?.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {userStats?.role_name || authUser.role}
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800">
                      {profile?.subscription_tier || 'free'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    Dernière connexion: {profile?.last_login ? 
                      new Date(profile.last_login).toLocaleString('fr-FR') : 
                      'Jamais'
                    }
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-0 space-y-6">
              {/* Abonnement actuel */}
              <Card className="uniform-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Abonnement actuel
                </h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Crown className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 capitalize">
                        Plan {botOwner?.subscription_plan || 'free'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {botOwner?.max_bots || 1} chatbot(s) maximum
                      </p>
                    </div>
                  </div>
                  <Badge className="uniform-badge-active">
                    Actif
                  </Badge>
                </div>
              </Card>

              {/* Fonctionnalités incluses */}
              <Card className="uniform-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Fonctionnalités incluses
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Création de chatbots personnalisés</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Gestion centralisée des messages</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Analytics et statistiques</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Intégrations webhook</span>
                  </div>
                </div>
              </Card>

              {/* Actions d'abonnement */}
              <Card className="uniform-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Gestion de l'abonnement
                </h3>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Vous êtes actuellement sur le plan gratuit. 
                    Passez au plan Premium pour débloquer plus de fonctionnalités.
                  </p>
                  <div className="flex space-x-3">
                    <Button className="uniform-button-primary">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Passer au Premium
                    </Button>
                    <Button className="uniform-button-secondary">
                      Voir les détails de facturation
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="mt-0 space-y-6">
              <Card className="uniform-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Rôle et Permissions
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Shield className="w-6 h-6 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900 capitalize">
                          Rôle: {userStats?.role_name || authUser.role}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Niveau d'accès attribué à votre compte
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Permissions disponibles ({authUser.permissions.length})
                    </h4>
                    {authUser.permissions.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {authUser.permissions.map((permission, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded">
                            <Key className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{permission}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Aucune permission spécifique attribuée</p>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <UserHistoryManagement />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};
