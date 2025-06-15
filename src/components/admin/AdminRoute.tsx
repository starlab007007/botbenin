
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  requiredPermission = 'system_administration' 
}) => {
  const { isLoading, hasPermission } = useAdminPermissions();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès Refusé
          </h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette section.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
