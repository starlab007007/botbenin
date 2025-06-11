
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePermissions?: string[];
  requireRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requirePermissions = [],
  requireRole
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('ProtectedRoute: État - isAuthenticated:', isAuthenticated, 'user:', user?.email, 'isLoading:', isLoading);

  // Afficher un chargement pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Vérification de l'authentification...</h2>
          <p className="text-gray-600">Veuillez patienter</p>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('ProtectedRoute: Redirection vers auth - pas authentifié');
    return <Navigate to="/" replace />;
  }

  // Check if user has required role
  if (requireRole && user.role !== requireRole) {
    console.log('ProtectedRoute: Accès refusé - rôle requis:', requireRole, 'rôle utilisateur:', user.role);
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600">
            Vous n'avez pas le rôle nécessaire pour accéder à cette page.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Rôle requis : {requireRole} | Votre rôle : {user.role}
          </p>
        </Card>
      </div>
    );
  }

  // Check if user has required permissions
  if (requirePermissions.length > 0) {
    const hasPermissions = requirePermissions.every(permission => 
      user.permissions.includes(permission)
    );

    if (!hasPermissions) {
      console.log('ProtectedRoute: Accès refusé - permissions manquantes:', requirePermissions, 'permissions utilisateur:', user.permissions);
      return (
        <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
          <Card className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
            <p className="text-gray-600">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Permissions requises : {requirePermissions.join(', ')}
            </p>
          </Card>
        </div>
      );
    }
  }

  console.log('ProtectedRoute: Accès autorisé pour:', user.email);
  return <>{children}</>;
};
