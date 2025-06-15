
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { PermissionsManager } from '@/components/admin/PermissionsManager';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Settings,
  Database,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export const AdminPanelPage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');

  // TODO: Vérifier si l'utilisateur a les permissions d'admin
  const hasAdminAccess = true; // À implémenter avec la vérification des permissions

  if (!hasAdminAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isMobile ? 'px-[2.5%]' : 'p-6'}`}>
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès Refusé
          </h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder au panneau d'administration.
          </p>
          <Button onClick={() => window.history.back()}>
            Retour
          </Button>
        </Card>
      </div>
    );
  }

  const tabs = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: LayoutDashboard,
      component: AdminDashboard,
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: Users,
      component: UserManagement,
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: Shield,
      component: PermissionsManager,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      component: SystemSettings,
    },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? '' : 'p-6'}`}>
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className={`bg-white rounded-lg shadow-sm ${isMobile ? 'rounded-t-none' : 'mb-6'}`}>
            <div className={`border-b ${isMobile ? 'px-[2.5%]' : 'px-6'} py-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Panneau d'Administration
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Gestion complète de la plateforme
                  </p>
                </div>
                {!isMobile && (
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">Système Opérationnel</span>
                  </div>
                )}
              </div>
            </div>

            <TabsList className={`w-full justify-start bg-transparent border-none ${isMobile ? 'px-[2.5%]' : 'px-6'} py-2`}>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
                >
                  <tab.icon className="w-4 h-4" />
                  {!isMobile && <span>{tab.label}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="m-0">
                <tab.component />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
};
