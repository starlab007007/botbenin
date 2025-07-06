
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoles } from '@/hooks/useRoles';
import { 
  Shield, 
  Search, 
  Settings, 
  Users, 
  Bot, 
  BarChart3, 
  DollarSign,
  HelpCircle,
  Megaphone
} from 'lucide-react';

export const PermissionManagement: React.FC = () => {
  const { permissions, isLoading } = useRoles();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || permission.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(permissions.map(p => p.category))];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users': return Users;
      case 'bots': return Bot;
      case 'platform': return Settings;
      case 'finance': return DollarSign;
      case 'support': return HelpCircle;
      case 'campaigns': return Megaphone;
      default: return Shield;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'users': return 'from-blue-500 to-blue-600';
      case 'bots': return 'from-purple-500 to-purple-600';
      case 'platform': return 'from-green-500 to-green-600';
      case 'finance': return 'from-yellow-500 to-yellow-600';
      case 'support': return 'from-red-500 to-red-600';
      case 'campaigns': return 'from-pink-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'view': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'create': return 'bg-green-100 text-green-800 border-green-200';
      case 'edit': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete': return 'bg-red-100 text-red-800 border-red-200';
      case 'manage': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Grouper les permissions par catégorie
  const permissionsByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredPermissions.filter(p => p.category === category);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <div className="space-y-6">
      {/* Header et filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des permissions</h2>
          <p className="text-gray-600 mt-1">
            Vue d'ensemble de toutes les permissions système
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Rechercher une permission..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques des permissions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
              <p className="text-sm text-gray-600">Total permissions</p>
            </div>
          </CardContent>
        </Card>
        
        {categories.slice(0, 3).map((category) => {
          const CategoryIcon = getCategoryIcon(category);
          const categoryColor = getCategoryColor(category);
          const count = permissions.filter(p => p.category === category).length;
          
          return (
            <Card key={category}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{category}</p>
                  </div>
                  <div className={`w-8 h-8 bg-gradient-to-r ${categoryColor} rounded-lg flex items-center justify-center`}>
                    <CategoryIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permissions par catégorie */}
      <div className="space-y-8">
        {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
          if (categoryPermissions.length === 0) return null;
          
          const CategoryIcon = getCategoryIcon(category);
          const categoryColor = getCategoryColor(category);
          
          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 bg-gradient-to-r ${categoryColor} rounded-lg flex items-center justify-center`}>
                  <CategoryIcon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 capitalize">
                  {category} ({categoryPermissions.length})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryPermissions.map((permission) => (
                  <Card key={permission.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{permission.name}</CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getActionBadgeColor(permission.action)}>
                              {permission.action}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {permission.resource}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm">
                        {permission.description || 'Aucune description disponible'}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPermissions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900 mb-2">Aucune permission</CardTitle>
            <CardDescription>
              Aucune permission ne correspond aux critères de recherche.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
