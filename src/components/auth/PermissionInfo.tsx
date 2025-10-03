import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';

interface PermissionInfoProps {
  /** Permission à vérifier */
  permission: string;
  /** Titre de l'alerte */
  title?: string;
  /** Description de ce que la permission permet */
  description?: string;
  /** Action suggérée si pas de permission */
  suggestedAction?: {
    label: string;
    onClick: () => void;
  };
  /** Variante visuelle */
  variant?: 'default' | 'info' | 'warning' | 'success';
  /** Afficher seulement si pas de permission */
  showOnlyWhenDenied?: boolean;
}

/**
 * Composant d'information contextuelle sur une permission
 * Affiche une alerte explicative sur le statut d'une permission
 * 
 * @example
 * <PermissionInfo 
 *   permission="bots.create"
 *   title="Créer des bots"
 *   description="Cette fonctionnalité vous permet de créer de nouveaux chatbots IA."
 *   suggestedAction={{
 *     label: "Demander l'accès",
 *     onClick: () => contactAdmin()
 *   }}
 * />
 */
export const PermissionInfo: React.FC<PermissionInfoProps> = ({
  permission,
  title = "Accès restreint",
  description = "Cette fonctionnalité nécessite des permissions spécifiques.",
  suggestedAction,
  variant = 'default',
  showOnlyWhenDenied = true,
}) => {
  const { hasPermission, isLoading } = usePermission(permission);

  if (isLoading) {
    return (
      <Alert>
        <Info className="h-4 w-4 animate-pulse" />
        <AlertTitle>Vérification des permissions...</AlertTitle>
      </Alert>
    );
  }

  // Ne pas afficher si permission accordée et showOnlyWhenDenied = true
  if (hasPermission && showOnlyWhenDenied) {
    return null;
  }

  const getIcon = () => {
    if (hasPermission) {
      return <ShieldCheck className="h-4 w-4" />;
    }
    return <ShieldAlert className="h-4 w-4" />;
  };

  const getVariantClass = () => {
    if (hasPermission) return '';
    if (variant === 'warning') return 'border-orange-500 bg-orange-50';
    if (variant === 'info') return 'border-blue-500 bg-blue-50';
    return 'border-red-500 bg-red-50';
  };

  return (
    <Alert className={getVariantClass()}>
      {getIcon()}
      <AlertTitle className="flex items-center justify-between">
        {hasPermission ? `✅ ${title}` : `🔒 ${title}`}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{description}</p>
        <div className="text-xs text-muted-foreground">
          <code className="bg-muted px-1 py-0.5 rounded">{permission}</code>
        </div>
        {!hasPermission && suggestedAction && (
          <div className="pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={suggestedAction.onClick}
            >
              {suggestedAction.label}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * Composant d'aide pour expliquer une permission
 */
export const PermissionHelp: React.FC<{
  permission: string;
  helpText: string;
}> = ({ permission, helpText }) => {
  const { hasPermission } = usePermission(permission);

  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
      <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="space-y-1">
        <p className="text-blue-900">{helpText}</p>
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <span>Statut:</span>
          {hasPermission ? (
            <span className="flex items-center gap-1 text-green-600">
              <ShieldCheck className="w-3 h-3" />
              Autorisé
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600">
              <ShieldAlert className="w-3 h-3" />
              Restreint
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
