
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  avatar?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
}

export interface UserContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User | null) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  hasPermission: (permission: string) => boolean;
  switchRole: (role: User['role']) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const rolePermissions = {
  admin: [
    'read_all', 'write_all', 'delete_all', 'manage_users', 'manage_roles',
    'view_analytics', 'manage_automations', 'access_all_modules'
  ],
  manager: [
    'read_all', 'write_most', 'manage_team', 'view_analytics', 
    'manage_automations', 'access_business_modules'
  ],
  user: [
    'read_own', 'write_own', 'use_automations', 'access_basic_modules'
  ],
  viewer: [
    'read_limited', 'view_dashboards'
  ]
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: '1',
    name: 'Utilisateur Admin',
    email: 'admin@bot.bj',
    role: 'admin',
    permissions: rolePermissions.admin,
    status: 'active',
    createdAt: new Date(),
    lastLogin: new Date()
  });

  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Utilisateur Admin',
      email: 'admin@bot.bj',
      role: 'admin',
      permissions: rolePermissions.admin,
      status: 'active',
      createdAt: new Date(),
      lastLogin: new Date()
    },
    {
      id: '2',
      name: 'Manager Commercial',
      email: 'manager@bot.bj',
      role: 'manager',
      permissions: rolePermissions.manager,
      status: 'active',
      createdAt: new Date(),
      lastLogin: new Date(Date.now() - 86400000)
    },
    {
      id: '3',
      name: 'Utilisateur Standard',
      email: 'user@bot.bj',
      role: 'user',
      permissions: rolePermissions.user,
      status: 'active',
      createdAt: new Date(),
      lastLogin: new Date(Date.now() - 172800000)
    }
  ]);

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...updates } : user
    ));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(null);
    }
  };

  const hasPermission = (permission: string) => {
    return currentUser?.permissions.includes(permission) || false;
  };

  const switchRole = (role: User['role']) => {
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        role,
        permissions: rolePermissions[role]
      };
      setCurrentUser(updatedUser);
      updateUser(currentUser.id, { role, permissions: rolePermissions[role] });
    }
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      users,
      setCurrentUser,
      addUser,
      updateUser,
      deleteUser,
      hasPermission,
      switchRole
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
