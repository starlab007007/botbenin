
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Bot, Users, MessageSquare, Settings, LogOut, BarChart3 } from 'lucide-react';
import { BotManagement } from '@/components/BotManagement';
import { MessagesOverview } from '@/components/MessagesOverview';
import { UserAnalytics } from '@/components/UserAnalytics';

interface Bot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
}

interface BotOwner {
  id: string;
  subscription_plan: string;
  max_bots: number;
}

export const DashboardPage: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<Bot[]>([]);
  const [botOwner, setBotOwner] = useState<BotOwner | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBotOwnerData();
      fetchBots();
    }
  }, [user]);

  const fetchBotOwnerData = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_owners')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setBotOwner(data);
    } catch (error) {
      console.error('Error fetching bot owner data:', error);
    }
  };

  const fetchBots = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les bots.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Déconnexion',
      description: 'Vous avez été déconnecté avec succès.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navItems = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'bots', label: 'Mes Bots', icon: Bot },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'users', label: 'Utilisateurs', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Bot.Bj Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Bonjour, {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Bots Actifs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">
                        {bots.filter(bot => bot.is_active).length}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Total Bots
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">
                        {bots.length}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900 capitalize">
                        {botOwner?.subscription_plan || 'Free'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Bienvenue sur Bot.Bj</CardTitle>
                    <CardDescription>
                      Gérez vos chatbots IA et analysez les interactions de vos utilisateurs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Avec votre plan {botOwner?.subscription_plan || 'free'}, vous pouvez créer jusqu'à {botOwner?.max_bots || 1} bot(s).
                    </p>
                    {bots.length < (botOwner?.max_bots || 1) && (
                      <Button onClick={() => setActiveTab('bots')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un nouveau bot
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'bots' && (
              <BotManagement 
                bots={bots} 
                setBots={setBots}
                botOwner={botOwner}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesOverview bots={bots} />
            )}

            {activeTab === 'users' && (
              <UserAnalytics bots={bots} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
