
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRoles } from '@/hooks/useRoles';
import { Key, Shield, Users, Bot, BarChart3 } from 'lucide-react';

export const PermissionManagement: React.FC = () => {
  const { permissions, isLoading } = useRoles();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestion des Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users':
        return Users;
      case 'bots':
        return Bot;
      case 'platform':
        return Shield;
      case 'analytics':
        return BarChart3;
      default:
        return Key;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'users':
        return 'border-l-blue-500 bg-blue-50';
      case 'bots':
        return 'border-l-purple-500 bg-purple-50';
      case 'platform':
        return 'border-l-red-500 bg-red-50';
      case 'analytics':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'view':
        return 'bg-blue-100 text-blue-800';
      case 'edit':
      case 'manage':
        return 'bg-orange-100 text-orange-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Gestion des Permissions</span>
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de toutes les permissions disponibles dans le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
              const CategoryIcon = getCategoryIcon(category);
              return (
                <Card key={category} className={`border-l-4 ${getCategoryColor(category)}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <CategoryIcon className="w-5 h-5" />
                      <span className="capitalize">{category}</span>
                      <Badge variant="secondary">{categoryPermissions.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {categoryPermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-medium text-gray-900">
                                {permission.name}
                              </h4>
                              <Badge className={getActionBadgeColor(permission.action)}>
                                {permission.action}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {permission.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-gray-500">
                                Ressource: {permission.resource}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Résumé des permissions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
          const CategoryIcon = getCategoryIcon(category);
          return (
            <Card key={category}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CategoryIcon className="w-4 h-4 text-gray-600" />
                  <div>
                    <div className="text-2xl font-bold">{categoryPermissions.length}</div>
                    <div className="text-sm text-gray-500 capitalize">{category}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
