import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGuard } from './PermissionGuard';
import { ConditionalRender } from './ConditionalRender';
import { PermissionButton } from './PermissionButton';
import { useUserPermissions } from '@/hooks/usePermission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Eye, Plus } from 'lucide-react';

/**
 * Composant de démonstration du système de permissions
 * À utiliser dans une page de test ou de documentation
 */
export const PermissionsExamples: React.FC = () => {
  const { permissions, isLoading } = useUserPermissions();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Mes Permissions</CardTitle>
          <CardDescription>
            Liste de toutes vos permissions actives
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Chargement...</p>
          ) : permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {permissions.map((perm) => (
                <Badge key={perm} variant="secondary">
                  {perm}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune permission</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemple 1: PermissionGuard</CardTitle>
          <CardDescription>
            Affiche du contenu uniquement si l'utilisateur a la permission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionGuard permission="users.edit">
            <div className="p-4 bg-green-100 dark:bg-green-900 rounded">
              ✅ Vous avez la permission "users.edit"
            </div>
          </PermissionGuard>

          <PermissionGuard permission="platform.admin">
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
              👑 Vous êtes super admin
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemple 2: ConditionalRender</CardTitle>
          <CardDescription>
            Masque/affiche des éléments selon permissions (sans message d'erreur)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <ConditionalRender permission="users.view">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Voir
              </Button>
            </ConditionalRender>

            <ConditionalRender permission="users.edit">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </ConditionalRender>

            <ConditionalRender permission="users.delete">
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </ConditionalRender>

            <ConditionalRender permission="users.create">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </ConditionalRender>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemple 3: PermissionButton</CardTitle>
          <CardDescription>
            Boutons qui se désactivent automatiquement avec tooltip
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <PermissionButton
              permission="users.delete"
              noPermissionMessage="Vous n'avez pas la permission de supprimer des utilisateurs"
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer Utilisateur
            </PermissionButton>

            <PermissionButton
              permission="bots.create"
              noPermissionMessage="Vous n'avez pas la permission de créer des bots"
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer Bot
            </PermissionButton>

            <PermissionButton
              permission="sheets.connect"
              noPermissionMessage="Vous n'avez pas la permission de connecter Google Sheets"
              variant="outline"
              size="sm"
            >
              Connecter Google Sheets
            </PermissionButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemple 4: Permissions Multiples</CardTitle>
          <CardDescription>
            Vérifier si l'utilisateur a au moins une permission parmi plusieurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionGuard 
            anyPermissions={["bots.edit.own", "bots.edit.all"]}
            fallbackMessage="Vous devez avoir 'bots.edit.own' OU 'bots.edit.all'"
          >
            <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded">
              ✅ Vous pouvez modifier au moins vos propres bots
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>
    </div>
  );
};
