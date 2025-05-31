
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Shield } from 'lucide-react';

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
  const { user, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has required role
  if (requireRole && user.role !== requireRole) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600">
            Vous n'avez pas le rôle nécessaire pour accéder à cette page.
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
      return (
        <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
          <Card className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
            <p className="text-gray-600">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
