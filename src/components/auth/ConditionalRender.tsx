import React from 'react';
import { usePermission, useAnyPermission } from '@/hooks/usePermission';

interface ConditionalRenderProps {
  /** Permission unique requise */
  permission?: string;
  /** Liste de permissions dont une au moins est requise */
  anyPermissions?: string[];
  /** Contenu à afficher si l'utilisateur a la permission */
  children: React.ReactNode;
  /** Contenu à afficher si l'utilisateur n'a pas la permission */
  fallback?: React.ReactNode;
}

/**
 * Composant pour affichage conditionnel sans message d'erreur
 * Utile pour masquer/afficher des boutons, sections, etc.
 * 
 * @example
 * <ConditionalRender permission="users.delete">
 *   <DeleteButton />
 * </ConditionalRender>
 */
export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  permission,
  anyPermissions,
  children,
  fallback = null,
}) => {
  const singlePermCheck = usePermission(permission || '');
  const multiPermCheck = useAnyPermission(anyPermissions || []);

  const { hasPermission, isLoading } = permission 
    ? singlePermCheck 
    : multiPermCheck;

  // Pendant le chargement, on ne rend rien (pas de flicker)
  if (isLoading) {
    return null;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Hook utilitaire pour désactiver des éléments selon permissions
 */
export const usePermissionDisabled = (permission: string) => {
  const { hasPermission, isLoading } = usePermission(permission);
  return {
    disabled: !hasPermission || isLoading,
    isLoading,
    hasPermission,
  };
};
