import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionButtonProps extends ButtonProps {
  /** Permission requise pour activer le bouton */
  permission: string;
  /** Message à afficher au survol si pas de permission */
  noPermissionMessage?: string;
}

/**
 * Bouton qui se désactive automatiquement si l'utilisateur n'a pas la permission
 * 
 * @example
 * <PermissionButton 
 *   permission="users.delete"
 *   noPermissionMessage="Vous n'avez pas la permission de supprimer des utilisateurs"
 *   onClick={handleDelete}
 * >
 *   Supprimer
 * </PermissionButton>
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  noPermissionMessage = "Permission requise",
  disabled,
  children,
  ...props
}) => {
  const { hasPermission, isLoading } = usePermission(permission);

  const isDisabled = disabled || !hasPermission || isLoading;

  if (!hasPermission && !isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button disabled={true} {...props}>
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{noPermissionMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button disabled={isDisabled} {...props}>
      {children}
    </Button>
  );
};
