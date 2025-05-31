
import React from 'react';
import { AuthUser } from '@/contexts/AuthContext';

interface AccountHeaderProps {
  userStats: {
    role_name: string;
  } | null;
  authUser: AuthUser;
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({ userStats, authUser }) => {
  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
        Mon Compte - {userStats?.role_name || authUser.role}
      </h1>
      <p className="text-gray-600">
        Gérez vos informations personnelles et votre abonnement
      </p>
    </div>
  );
};
