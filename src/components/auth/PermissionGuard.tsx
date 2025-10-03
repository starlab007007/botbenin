import React from 'react';
import { usePermission, useAnyPermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  /** Permission unique requise */
  permission?: string;
  /** Liste de permissions dont une au moins est requise */
  anyPermissions?: string[];
  /** Contenu à afficher si l'utilisateur a la permission */
  children: React.ReactNode;
  /** Message personnalisé à afficher si l'accès est refusé */
  fallbackMessage?: string;
  /** Composant personnalisé à afficher si l'accès est refusé */
  fallback?: React.ReactNode;
  /** Si true, affiche un loader pendant la vérification */
  showLoader?: boolean;
}

/**
 * Composant Guard pour protéger l'affichage selon les permissions
 * 
 * @example
 * // Permission unique
 * <PermissionGuard permission="users.edit">
 *   <EditUserButton />
 * </PermissionGuard>
 * 
 * @example
 * // Au moins une permission parmi plusieurs
 * <PermissionGuard anyPermissions={["bots.edit.own", "bots.edit.all"]}>
 *   <EditBotButton />
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  anyPermissions,
  children,
  fallbackMessage = "Vous n'avez pas la permission d'accéder à cette fonctionnalité.",
  fallback,
  showLoader = true,
}) => {
  // Vérification single permission
  const singlePermCheck = usePermission(permission || '');
  
  // Vérification multiple permissions
  const multiPermCheck = useAnyPermission(anyPermissions || []);

  // Déterminer quel check utiliser
  const { hasPermission, isLoading } = permission 
    ? singlePermCheck 
    : multiPermCheck;

  if (isLoading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="destructive" className="my-4">
        <Lock className="h-4 w-4" />
        <AlertDescription>{fallbackMessage}</AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

/**
 * HOC pour protéger une page entière avec une permission
 */
export const withPermission = (
  Component: React.ComponentType,
  permission: string,
  fallbackMessage?: string
) => {
  return (props: any) => (
    <PermissionGuard permission={permission} fallbackMessage={fallbackMessage}>
      <Component {...props} />
    </PermissionGuard>
  );
};
