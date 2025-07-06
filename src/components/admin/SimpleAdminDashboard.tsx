
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Settings, BarChart3 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export const SimpleAdminDashboard: React.FC = () => {
  const { isAdmin, hasPermission, isLoading, currentUser } = useUser();

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
            <div className="mt-4 text-sm text-gray-500">
              <p>Utilisateur actuel: {currentUser?.email}</p>
              <p>Rôle: {currentUser?.role}</p>
              <p>Permissions: {currentUser?.permissions.join(', ') || 'Aucune'}</p>
            </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              +0% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bots Actifs</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-xs text-muted-foreground">
              +0% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Les dernières actions sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Aucune activité récente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques système</CardTitle>
            <CardDescription>
              État général de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Système</span>
                <span className="text-sm text-green-600">Opérationnel</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Base de données</span>
                <span className="text-sm text-green-600">Connectée</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Authentification</span>
                <span className="text-sm text-green-600">Fonctionnel</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
