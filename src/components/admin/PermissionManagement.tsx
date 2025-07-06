
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
  Key, 
  Search, 
  Filter, 
  Shield,
  Users,
  Bot,
  Settings,
  DollarSign,
  BarChart3,
  MessageSquare
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

  const getPermissionIcon = (category: string) => {
    switch (category) {
      case 'users': return Users;
      case 'bots': return Bot;
      case 'platform': return Settings;
      case 'finance': return DollarSign;
      case 'campaigns': return BarChart3;
      case 'support': return MessageSquare;
      default: return Key;
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'users': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bots': return 'bg-green-100 text-green-800 border-green-200';
      case 'platform': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'finance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'campaigns': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'support': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const categories = [...new Set(permissions.map(p => p.category))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header et filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Gestion des permissions ({filteredPermissions.length})
          </CardTitle>
          <CardDescription>
            Consultez et gérez toutes les permissions système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
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
          </div>
        </CardContent>
      </Card>

      {/* Liste des permissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPermissions.map((permission) => {
          const PermissionIcon = getPermissionIcon(permission.category);
          return (
            <Card key={permission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <PermissionIcon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {permission.name}
                      </h3>
                    </div>
                    
                    <Badge className={`${getCategoryBadgeColor(permission.category)} text-xs mb-2`}>
                      {permission.category}
                    </Badge>
                    
                    <p className="text-xs text-gray-600 mb-2">
                      {permission.description}
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      <p>Ressource: {permission.resource}</p>
                      <p>Action: {permission.action}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPermissions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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
