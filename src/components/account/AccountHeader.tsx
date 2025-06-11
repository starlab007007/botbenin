
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AuthUser } from '@/contexts/AuthContext';
import { Shield, Calendar, Mail, Phone, Building } from 'lucide-react';

interface AccountHeaderProps {
  userStats: {
    role_name: string;
    full_name?: string;
  } | null;
  authUser: AuthUser;
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({ userStats, authUser }) => {
  const displayName = userStats?.full_name || authUser.name || authUser.email;
  
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-start space-x-6">
        <Avatar className="h-20 w-20">
          {authUser.profile?.avatar_url ? (
            <AvatarImage src={authUser.profile.avatar_url} alt={displayName} />
          ) : (
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold">
              {getUserInitials(displayName)}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {displayName}
            </h1>
            <Badge className={`${getRoleColor(authUser.role)} font-medium`}>
              <Shield className="w-3 h-3 mr-1" />
              {authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)}
            </Badge>
            {authUser.authProvider === 'google' && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
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
            )}
            {authUser.emailVerified && (
              <Badge className="bg-green-100 text-green-800 border border-green-200">
                Email vérifié
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{authUser.email}</span>
            </div>
            
            {authUser.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{authUser.phone}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Membre depuis {formatDate(authUser.createdAt)}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-gray-400" />
              <span className="capitalize">Abonnement {authUser.subscription?.type}</span>
            </div>
          </div>
          
          {authUser.profile?.bio && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                {authUser.profile.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
