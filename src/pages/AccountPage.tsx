
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserHistoryManagement } from '@/components/UserHistoryManagement';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { AccountHeader } from '@/components/account/AccountHeader';
import { PersonalInfoForm } from '@/components/account/PersonalInfoForm';
import { AccountStats } from '@/components/account/AccountStats';
import { AccountStatus } from '@/components/account/AccountStatus';
import { PermissionsTab } from '@/components/account/PermissionsTab';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Crown, 
  Shield, 
  History
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
        
        if (profileData.bot_owners && Array.isArray(profileData.bot_owners) && profileData.bot_owners.length > 0) {
          setBotOwner(profileData.bot_owners[0]);
        } else {
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

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

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
      <AccountHeader userStats={userStats} authUser={authUser} />

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
              <PersonalInfoForm
                authUser={authUser}
                profile={profile}
                formData={formData}
                setFormData={setFormData}
                onUpdate={updateUserProfile}
                isUpdating={isUpdating}
              />
              <AccountStats userStats={userStats} />
              <AccountStatus profile={profile} userStats={userStats} authUser={authUser} />
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-0 space-y-6">
              <SubscriptionManagement />
            </TabsContent>

            <TabsContent value="permissions" className="mt-0 space-y-6">
              <PermissionsTab userStats={userStats} authUser={authUser} />
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
