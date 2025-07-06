
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { PermissionManagement } from './PermissionManagement';
import { AdminStats } from './AdminStats';
import { Shield, Users, Settings, BarChart3 } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';

export const AdminDashboard: React.FC = () => {
  const { isAdmin, hasPermission, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !hasPermission('platform.settings')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900 mb-2">Accès refusé</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder au panneau d'administration.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-1">
            Gestion complète de la plateforme et des utilisateurs
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <Shield className="w-4 h-4" />
          <span>Administrateur connecté</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Statistiques</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Rôles</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Permissions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <AdminStats />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <PermissionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
