import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useWaouhPartner } from '@/hooks/useWaouhPartner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface PartnerRouteProps {
  children: React.ReactNode;
  /** If true, requires an active partner. Otherwise just authenticated. */
  requireActive?: boolean;
}

export const PartnerRoute: React.FC<PartnerRouteProps> = ({ children, requireActive = true }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const { partner, loading: partnerLoading } = useWaouhPartner();

  if (authLoading || roleLoading || partnerLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <>{children}</>;
  if (!requireActive) return <>{children}</>;

  if (!partner) {
    return <Navigate to="/partner" replace />;
  }
  if (partner.statut !== 'active') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <Clock className="h-5 w-5" />
          <AlertTitle>Compte partenaire {partner.statut === 'pending' ? 'en attente de validation' : partner.statut}</AlertTitle>
          <AlertDescription>
            {partner.statut === 'pending'
              ? "Votre demande est en cours d'examen par notre équipe. Vous recevrez une notification dès l'activation."
              : partner.statut === 'suspended'
                ? "Votre compte partenaire est suspendu. Contactez le support."
                : "Votre demande a été refusée. Contactez le support pour plus d'informations."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return <>{children}</>;
};

export const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};
