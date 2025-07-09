import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/UserContext';
import { AdminControlPanel } from '@/components/AdminControlPanel';
import { AdminStats } from '@/components/AdminStats';
import { UsersManagement } from '@/components/UsersManagement';
import { SystemLogs } from '@/components/SystemLogs';
import { GlobalSettings } from '@/components/GlobalSettings';
import { IntelligentSuggestionsDemo } from '@/components/IntelligentSuggestionsDemo';
import { 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  FileText,
  Crown
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { currentUser, hasPermission } = useUser();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Vérifier les permissions admin
  if (!hasPermission('platform.admin')) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Accès Restreint
            </h2>
            <p className="text-gray-600">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Administration
                </h1>
                <p className="text-sm text-gray-500">
                  Connecté en tant que {currentUser?.name} ({currentUser?.email})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Super Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Admins</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Tests IA</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AdminStats stats={{
              total_users: 0,
              active_users_24h: 0,
              active_users_7d: 0,
              new_users_30d: 0,
              total_bots: 0,
              active_bots: 0,
              total_campaigns: 0,
              active_campaigns: 0,
              total_messages_24h: 0,
              total_subscriptions: 0,
              revenue_monthly: 0
            }} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <AdminControlPanel />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <SystemLogs />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <GlobalSettings />
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-purple-500" />
                  <span>Tests du Système de Suggestions Intelligentes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-sm text-gray-600">
                    <p className="mb-4">
                      Testez le nouveau système de suggestions intelligentes qui s'adapte automatiquement aux domaines des bots.
                      Le système utilise l'IA pour détecter le contexte et proposer des suggestions personnalisées.
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      onClick={() => window.open('/test-suggestions', '_blank')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      🧪 Ouvrir la page de test complète
                    </Button>
                    
                    <Button
                      onClick={() => window.open('/test-suggestions?context=restaurant', '_blank')}
                      variant="outline"
                    >
                      🍽️ Test contexte Restaurant
                    </Button>
                    
                    <Button
                      onClick={() => window.open('/test-suggestions?context=business', '_blank')}
                      variant="outline"
                    >
                      💼 Test contexte Business
                    </Button>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4">Aperçu rapide du système :</h4>
                    <IntelligentSuggestionsDemo
                      userContext="services_locaux"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};