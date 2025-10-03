import React from 'react';
import { usePermission, useAnyPermission } from '@/hooks/usePermission';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, ShieldAlert, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="destructive" className="my-4">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle className="ml-2">Accès restreint</AlertTitle>
        <AlertDescription className="ml-2 mt-2">
          <p>{fallbackMessage}</p>
          {(permission || anyPermissions) && (
            <div className="mt-2 text-xs opacity-75">
              <p className="font-medium">Permissions requises :</p>
              <code className="bg-destructive/10 px-1 py-0.5 rounded mt-1 block">
                {permission || anyPermissions?.join(' ou ')}
              </code>
            </div>
          )}
        </AlertDescription>
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
