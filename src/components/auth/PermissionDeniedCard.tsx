import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ShieldAlert, Mail, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PermissionDeniedCardProps {
  /** Titre de la fonctionnalité bloquée */
  featureTitle: string;
  /** Description de la fonctionnalité */
  featureDescription: string;
  /** Permissions requises */
  requiredPermissions: string[];
  /** Action de contact administrateur */
  onContactAdmin?: () => void;
  /** Lien vers documentation */
  documentationUrl?: string;
  /** Afficher le badge "Premium" */
  isPremium?: boolean;
}

/**
 * Carte élégante affichée quand une fonctionnalité est bloquée par manque de permission
 * 
 * @example
 * <PermissionDeniedCard
 *   featureTitle="Analytiques Avancées"
 *   featureDescription="Accédez à des statistiques détaillées et des rapports personnalisés."
 *   requiredPermissions={['analytics.view.advanced']}
 *   onContactAdmin={contactSupport}
 *   isPremium
 * />
 */
export const PermissionDeniedCard: React.FC<PermissionDeniedCardProps> = ({
  featureTitle,
  featureDescription,
  requiredPermissions,
  onContactAdmin,
  documentationUrl,
  isPremium = false,
}) => {
  return (
    <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {featureTitle}
                {isPremium && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Premium
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{featureDescription}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-orange-900">Accès restreint</p>
            <p className="text-orange-700 mt-1">
              Cette fonctionnalité nécessite des permissions spécifiques pour être utilisée.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Permissions requises :</p>
          <div className="flex flex-wrap gap-2">
            {requiredPermissions.map((perm) => (
              <Badge key={perm} variant="outline" className="font-mono text-xs">
                {perm}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-2">
          {onContactAdmin && (
            <Button 
              onClick={onContactAdmin}
              variant="default"
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contacter l'administrateur
            </Button>
          )}
          {documentationUrl && (
            <Button 
              onClick={() => window.open(documentationUrl, '_blank')}
              variant="outline"
              className="flex-1"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              En savoir plus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
