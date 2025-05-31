
import React from 'react';
import { AuthUser } from '@/contexts/AuthContext';

interface AccountHeaderProps {
  userStats: {
    role_name: string;
    full_name?: string;
  } | null;
  authUser: AuthUser;
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({ userStats, authUser }) => {
  const displayName = userStats?.full_name || authUser.name || authUser.email;

  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
        Mon Compte - {displayName}
      </h1>
      <p className="text-gray-600">
        Gérez vos informations personnelles et votre abonnement
      </p>
      <div className="mt-2">
        <span className="text-sm text-gray-500">
          Rôle: {userStats?.role_name || authUser.role}
        </span>
      </div>
    </div>
  );
};
