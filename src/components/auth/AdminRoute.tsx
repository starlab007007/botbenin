import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            Seuls les administrateurs peuvent accéder à cette section.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
