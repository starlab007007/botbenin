
import React from 'react';
import { UserPermissions } from './DashboardStats';

interface DashboardHeaderProps {
  permissions: UserPermissions;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ permissions }) => {
  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
        Tableau de bord - Profil {permissions.role}
      </h1>
      <p className="text-gray-600">
        Créez et gérez vos chatbots connectés via webhook
      </p>
    </div>
  );
};
