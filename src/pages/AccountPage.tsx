
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, Crown, Shield } from 'lucide-react';

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

export const AccountPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [botOwner, setBotOwner] = useState<BotOwnerInfo | null>(null);
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="p-4 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
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
          Mon Compte
        </h1>
        <p className="text-gray-600">
          Gérez vos informations personnelles et votre abonnement
        </p>
      </div>

      <Card className="bg-white border border-gray-200 rounded-xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Abonnement</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="profile" className="mt-0 space-y-6">
              {/* Informations générales */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Votre nom complet"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <Input
                      value={authUser.email || ''}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membre depuis
                    </label>
                    <Input
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <Button 
                    onClick={updateProfile}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? 'Mise à jour...' : 'Sauvegarder les modifications'}
                  </Button>
                </div>
              </Card>

              {/* Statistiques du compte */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Statistiques du compte
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {botOwner?.max_bots || 0}
                    </div>
                    <div className="text-sm text-gray-600">Bots autorisés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {profile?.last_login ? '✓' : '?'}
                    </div>
                    <div className="text-sm text-gray-600">Dernière connexion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {profile?.subscription_tier === 'free' ? 'Gratuit' : 'Premium'}
                    </div>
                    <div className="text-sm text-gray-600">Type de compte</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      ∞
                    </div>
                    <div className="text-sm text-gray-600">Messages restants</div>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-0 space-y-6">
              {/* Abonnement actuel */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Abonnement actuel
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Crown className="w-6 h-6 text-blue-600" />
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
                  <Badge variant="default">
                    Actif
                  </Badge>
                </div>
              </Card>

              {/* Fonctionnalités incluses */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Fonctionnalités incluses
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Création de chatbots personnalisés</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Gestion centralisée des messages</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Analytics et statistiques</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Intégrations webhook</span>
                  </div>
                </div>
              </Card>

              {/* Facturation */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations de facturation
                </h3>
                <p className="text-gray-600 mb-4">
                  Vous êtes actuellement sur le plan gratuit. Aucune facturation n'est requise.
                </p>
                <Button variant="outline">
                  Passer au plan Premium
                </Button>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};
