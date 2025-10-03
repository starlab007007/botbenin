import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Check, AlertTriangle } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionBadgeProps {
  /** Permission à vérifier */
  permission: string;
  /** Afficher le badge même si l'utilisateur a la permission */
  showWhenGranted?: boolean;
  /** Message personnalisé quand permission accordée */
  grantedMessage?: string;
  /** Message personnalisé quand permission refusée */
  deniedMessage?: string;
  /** Variante du badge */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Badge visuel indiquant le statut d'une permission
 * 
 * @example
 * <PermissionBadge 
 *   permission="bots.create"
 *   deniedMessage="Vous ne pouvez pas créer de bots"
 * />
 */
export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  permission,
  showWhenGranted = false,
  grantedMessage = "Permission accordée",
  deniedMessage = "Permission requise",
  variant,
}) => {
  const { hasPermission, isLoading } = usePermission(permission);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <div className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin" />
        <span className="text-xs">Vérification...</span>
      </Badge>
    );
  }

  // Ne pas afficher si permission accordée et showWhenGranted = false
  if (hasPermission && !showWhenGranted) {
    return null;
  }

  const icon = hasPermission ? (
    <Check className="w-3 h-3" />
  ) : (
    <Lock className="w-3 h-3" />
  );

  const badgeVariant = variant || (hasPermission ? 'default' : 'destructive');
  const message = hasPermission ? grantedMessage : deniedMessage;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className="gap-1 cursor-help">
            {icon}
            <span className="text-xs">{hasPermission ? 'Autorisé' : 'Restreint'}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">
              Permission: <code className="text-xs">{permission}</code>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Badge pour afficher le statut de plusieurs permissions
 */
export const PermissionsBadge: React.FC<{
  permissions: string[];
  requireAll?: boolean;
}> = ({ permissions, requireAll = false }) => {
  const permChecks = permissions.map(perm => usePermission(perm));
  
  const hasAny = permChecks.some(check => check.hasPermission);
  const hasAll = permChecks.every(check => check.hasPermission);
  const isLoading = permChecks.some(check => check.isLoading);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        <span className="text-xs">Vérification...</span>
      </Badge>
    );
  }

  const hasRequired = requireAll ? hasAll : hasAny;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={hasRequired ? 'default' : 'destructive'} className="gap-1 cursor-help">
            {hasRequired ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span className="text-xs">
              {hasRequired ? 'Autorisé' : 'Restreint'}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-medium">
              {requireAll ? 'Toutes les permissions requises' : 'Au moins une permission requise'}
            </p>
            <div className="space-y-1">
              {permissions.map((perm, idx) => (
                <div key={perm} className="flex items-center gap-2 text-xs">
                  {permChecks[idx]?.hasPermission ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Lock className="w-3 h-3 text-red-500" />
                  )}
                  <code className="text-xs">{perm}</code>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
