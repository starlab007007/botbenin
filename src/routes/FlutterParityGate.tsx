import { Navigate, useLocation } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';

/**
 * Parité Flutter (branche `codex`) :
 * l'application utilisateur n'expose que les modules présents dans l'app Flutter
 * (Chat/WAOUH, Notifications, Bots — BI / Stock / Présence QR, WhatsApp IA,
 * Diffusion, Partenaire, Profil, Auth).
 *
 * Les modules web historiques ne sont PAS supprimés : ils restent accessibles
 * aux administrateurs (back-office) et sont masqués pour tous les autres.
 */
export const FlutterParityGate = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoading } = useAdminRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/app/chat" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default FlutterParityGate;
