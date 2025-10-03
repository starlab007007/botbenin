import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User, CheckCircle2 } from 'lucide-react';

export const UserRoleDebug: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-4">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="border-2 border-yellow-500">
        <CardContent className="py-4">
          <p className="text-yellow-600 font-semibold">❌ Non authentifié</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Informations d'authentification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{user.name}</span>
          <span className="text-sm text-muted-foreground">({user.email})</span>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Rôle actuel:</p>
          <Badge 
            variant={user.role === 'admin' ? 'default' : 'secondary'}
            className="text-lg px-4 py-1"
          >
            {user.role === 'admin' && <Shield className="h-4 w-4 mr-1" />}
            {user.role.toUpperCase()}
          </Badge>
        </div>

        {/* Permissions */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Permissions ({user.permissions.length}):
          </p>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
            {user.permissions.map((permission, index) => (
              <Badge 
                key={index} 
                variant="outline"
                className="text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                {permission}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            ID: <code className="text-xs bg-muted px-1 rounded">{user.id}</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};