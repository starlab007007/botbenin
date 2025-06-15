
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AdminPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminPermissions();
  }, [user]);

  const checkAdminPermissions = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Vérifier si l'utilisateur a des permissions d'administration
      const { data, error } = await supabase
        .rpc('user_has_permission', {
          user_uuid: user.id,
          permission_name: 'users.view'
        });

      if (error) throw error;
      setHasPermission(data || false);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: TrendingUp },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'logs', label: 'Logs', icon: Activity },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard onNavigate={setActiveSection} />;
      case 'users':
        return <AdminUserManagement />;
      case 'subscriptions':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Gestion des Abonnements</h2>
            <p className="text-gray-600">Cette section sera bientôt disponible.</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Analytics Plateforme</h2>
            <p className="text-gray-600">Cette section sera bientôt disponible.</p>
          </div>
        );
      case 'logs':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Logs Système</h2>
            <p className="text-gray-600">Cette section sera bientôt disponible.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Paramètres Plateforme</h2>
            <p className="text-gray-600">Cette section sera bientôt disponible.</p>
          </div>
        );
      default:
        return <AdminDashboard onNavigate={setActiveSection} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h2>
            <p className="text-gray-600 mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
