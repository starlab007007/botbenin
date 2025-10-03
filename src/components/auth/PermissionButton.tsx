import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, ShieldAlert } from 'lucide-react';

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
              <Button disabled={true} {...props} className={`opacity-60 ${props.className || ''}`}>
                <Lock className="w-3 h-3 mr-2" />
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                <p className="font-medium">Permission requise</p>
              </div>
              <p className="text-sm">{noPermissionMessage}</p>
              <p className="text-xs text-muted-foreground mt-2">
                <code className="bg-muted px-1 py-0.5 rounded">{permission}</code>
              </p>
            </div>
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
