
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthUser } from '@/contexts/AuthContext';

interface AccountStatusProps {
  profile: any;
  userStats: {
    role_name: string;
    email?: string;
    full_name?: string;
    phone?: string;
  } | null;
  authUser: AuthUser;
}

export const AccountStatus: React.FC<AccountStatusProps> = ({ profile, userStats, authUser }) => {
  return (
    <Card className="uniform-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Status du compte
      </h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge className={`${profile?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {profile?.is_active ? 'Actif' : 'Inactif'}
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">
            {userStats?.role_name || authUser.role}
          </Badge>
          <Badge className="bg-purple-100 text-purple-800">
            {profile?.subscription_tier || 'free'}
          </Badge>
          {authUser.authProvider === 'google' && (
            <Badge className="bg-blue-100 text-blue-800">
              Connecté via Google
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Dernière connexion: {profile?.last_login ? 
            new Date(profile.last_login).toLocaleString('fr-FR') : 
            'Jamais'
          }
        </div>
      </div>
    </Card>
  );
};
