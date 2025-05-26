import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Settings, 
  Shield, 
  Eye, 
  Edit3, 
  Trash2,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export const UsersManagementPage: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, hasPermission } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const roles = [
    { id: 'admin', name: 'Administrateur', permissions: 8, color: 'text-red-600' },
    { id: 'manager', name: 'Manager', permissions: 6, color: 'text-blue-600' },
    { id: 'user', name: 'Utilisateur', permissions: 4, color: 'text-green-600' },
    { id: 'viewer', name: 'Observateur', permissions: 2, color: 'text-gray-600' }
  ];

  if (!hasPermission('manage_users')) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center bg-white border border-gray-200 rounded-xl">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Gestion des utilisateurs</h1>
          <p className="text-gray-600">Gérez les utilisateurs, rôles et permissions de votre plateforme.</p>
        </div>
        <Button className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total utilisateurs</h3>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <Users className="w-8 h-8 text-gray-600" />
          </div>
        </Card>
        
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Utilisateurs actifs</h3>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </div>
            </div>
            <Shield className="w-8 h-8 text-gray-600" />
          </div>
        </Card>
        
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Administrateurs</h3>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </div>
            <Settings className="w-8 h-8 text-gray-600" />
          </div>
        </Card>
        
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">En attente</h3>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'pending').length}
              </div>
            </div>
            <Eye className="w-8 h-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white text-gray-900"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white text-gray-900"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="manager">Manager</option>
              <option value="user">Utilisateur</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>
          
          <Button variant="outline" className="border-gray-300 text-gray-900 bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filtres avancés
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Liste des utilisateurs</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Utilisateur</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Rôle</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Statut</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Dernière connexion</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-gray-100 text-gray-900 border border-gray-200">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className="bg-gray-100 text-gray-900 border border-gray-200">
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Jamais'}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm" className="p-2 text-gray-600 hover:text-gray-900">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-2 text-gray-600 hover:text-gray-900">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button variant="ghost" size="sm" className="p-2 text-gray-600 hover:text-gray-900">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Roles Management */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Gestion des rôles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{role.name}</h3>
                <Button variant="ghost" size="sm" className="p-1 text-gray-600 hover:text-gray-900">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {role.permissions} permissions
              </p>
              <div className="text-sm text-gray-500">
                {users.filter(u => u.role === role.id).length} utilisateur(s)
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
