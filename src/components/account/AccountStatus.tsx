
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthUser } from '@/contexts/AuthContext';
import { Shield, Check, Clock, Globe } from 'lucide-react';

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
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Jamais';
    try {
      return new Date(date).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <Card className="uniform-card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Statut du compte
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statut général */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Informations générales</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Statut du compte</span>
              <Badge className={`${profile?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {profile?.is_active ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Actif
                  </>
                ) : (
                  'Inactif'
                )}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rôle</span>
              <Badge className="bg-blue-100 text-blue-800">
                <Shield className="w-3 h-3 mr-1" />
                {userStats?.role_name || authUser.role}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Abonnement</span>
              <Badge className="bg-purple-100 text-purple-800">
                {authUser.subscription?.type || 'free'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Informations d'authentification */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Authentification</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Méthode de connexion</span>
              {authUser.authProvider === 'google' ? (
                <Badge className="bg-blue-100 text-blue-800">
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">
                  Email/Mot de passe
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email vérifié</span>
              {authUser.emailVerified ? (
                <Badge className="bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  Vérifié
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3 mr-1" />
                  En attente
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dernière connexion</span>
              <span className="text-sm text-gray-500">
                {formatDate(authUser.lastLogin)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Informations temporelles */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Compte créé le {formatDate(authUser.createdAt)}</span>
          </div>
          {authUser.profile?.preferences?.timezone && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Globe className="w-4 h-4" />
              <span>Fuseau horaire: {authUser.profile.preferences.timezone}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
