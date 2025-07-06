
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AdminLoginForm } from '@/components/AdminLoginForm';
import { Shield, CheckCircle, Users, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminSetupPage: React.FC = () => {
  const [hasAdmins, setHasAdmins] = useState<boolean | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkAdminUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_admin_users');
      
      if (error) {
        console.error('Erreur lors de la vérification des admins:', error);
        setHasAdmins(false);
      } else {
        setAdminUsers(data || []);
        setHasAdmins(data && data.length > 0);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setHasAdmins(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAdminUsers();
  }, []);

  const handleAdminCreated = () => {
    toast({
      title: "Configuration terminée",
      description: "Le compte administrateur a été configuré avec succès",
    });
    checkAdminUsers();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Configuration Administrative</h1>
          <p className="text-gray-600">
            {hasAdmins ? 'Gestion des comptes administrateurs' : 'Première configuration de la plateforme'}
          </p>
        </div>

        {!hasAdmins ? (
          <div className="space-y-8">
            {/* Étapes de configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>Étapes de Configuration</span>
                </CardTitle>
                <CardDescription>
                  Suivez ces étapes pour configurer votre premier compte administrateur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-md">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <span>Créer le compte administrateur principal</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <span>Attribution automatique des privilèges complets</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <span>Accès au panneau d'administration</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Formulaire de création */}
            <AdminLoginForm onAdminCreated={handleAdminCreated} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Confirmation des admins existants */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-green-600">Configuration Terminée</CardTitle>
                </div>
                <CardDescription>
                  La plateforme dispose déjà de comptes administrateurs configurés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nombre d'administrateurs :</span>
                    <span className="font-semibold">{adminUsers.length}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Administrateurs actifs :</h4>
                    {adminUsers.map((admin, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="font-medium">{admin.email}</span>
                        <span className="text-xs text-gray-500">
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Gestion des Utilisateurs</span>
                  </CardTitle>
                  <CardDescription>
                    Gérer les utilisateurs et leurs permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/users-management">
                    <Button className="w-full">
                      Accéder à la Gestion
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    <span>Ajouter un Admin</span>
                  </CardTitle>
                  <CardDescription>
                    Créer un nouveau compte administrateur
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminLoginForm onAdminCreated={handleAdminCreated} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Liens de navigation */}
        <div className="text-center">
          <Link to="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};
