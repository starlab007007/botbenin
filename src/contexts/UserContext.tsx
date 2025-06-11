
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser, updateProfile } = useAuth();

  // Convert AuthUser to User format for backward compatibility
  const currentUser: User | null = authUser ? {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    avatar: authUser.avatar,
    permissions: authUser.permissions,
    status: authUser.status,
    lastLogin: authUser.lastLogin,
    createdAt: authUser.createdAt
  } : null;

  const users: User[] = currentUser ? [currentUser] : [];

  const setCurrentUser = (user: User | null) => {
    // This is handled by the AuthContext
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    // This would be handled by admin functions
    console.log('Add user:', userData);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    if (currentUser && currentUser.id === id) {
      updateProfile(updates as any);
    }
  };

  const deleteUser = (id: string) => {
    // This would be handled by admin functions
    console.log('Delete user:', id);
  };

  const hasPermission = (permission: string) => {
    return currentUser?.permissions.includes(permission) || false;
  };

  const switchRole = (role: User['role']) => {
    // This would be handled by admin functions
    console.log('Switch role:', role);
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
