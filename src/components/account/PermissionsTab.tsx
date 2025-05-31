
import React from 'react';
import { Card } from '@/components/ui/card';
import { Shield, Key } from 'lucide-react';
import { AuthUser } from '@/contexts/AuthContext';

interface PermissionsTabProps {
  userStats: {
    role_name: string;
  } | null;
  authUser: AuthUser;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({ userStats, authUser }) => {
  return (
    <Card className="uniform-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Rôle et Permissions
      </h3>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="w-6 h-6 text-gray-600" />
            <div>
              <h4 className="font-semibold text-gray-900 capitalize">
                Rôle: {userStats?.role_name || authUser.role}
              </h4>
              <p className="text-sm text-gray-600">
                Niveau d'accès attribué à votre compte
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Permissions disponibles ({authUser.permissions.length})
          </h4>
          {authUser.permissions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {authUser.permissions.map((permission, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded">
                  <Key className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{permission}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aucune permission spécifique attribuée</p>
          )}
        </div>
      </div>
    </Card>
  );
};
