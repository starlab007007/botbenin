
import React from 'react';

interface DashboardHeaderProps {
  role: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ role }) => {
  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
        Tableau de bord - Profil {role}
      </h1>
      <p className="text-gray-600">
        Gérez vos fonctionnalités selon vos permissions
      </p>
    </div>
  );
};
