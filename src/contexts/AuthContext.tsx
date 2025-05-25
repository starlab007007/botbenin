
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  avatar?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
  subscription?: {
    type: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'expired' | 'cancelled';
    expiresAt?: Date;
  };
  chatHistory: Array<{
    id: string;
    timestamp: Date;
    messages: Array<{
      content: string;
      isUser: boolean;
      timestamp: Date;
    }>;
  }>;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPhone: (phone: string, password: string) => Promise<boolean>;
  register: (userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rolePermissions = {
  admin: [
    'read_all', 'write_all', 'delete_all', 'manage_users', 'manage_roles',
    'view_analytics', 'manage_automations', 'access_all_modules', 'manage_subscriptions'
  ],
  manager: [
    'read_all', 'write_most', 'manage_team', 'view_analytics', 
    'manage_automations', 'access_business_modules'
  ],
  user: [
    'read_own', 'write_own', 'use_automations', 'access_basic_modules', 'manage_profile'
  ],
  viewer: [
    'read_limited', 'view_dashboards'
  ]
};

// Mock users database
const mockUsers: AuthUser[] = [
  {
    id: '1',
    name: 'Administrateur Principal',
    email: 'admin@bot.bj',
    phone: '+22997123456',
    role: 'admin',
    permissions: rolePermissions.admin,
    status: 'active',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
    subscription: {
      type: 'enterprise',
      status: 'active'
    },
    chatHistory: []
  },
  {
    id: '2',
    name: 'Manager Commercial',
    email: 'manager@bot.bj',
    phone: '+22997654321',
    role: 'manager',
    permissions: rolePermissions.manager,
    status: 'active',
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date(Date.now() - 86400000),
    subscription: {
      type: 'pro',
      status: 'active'
    },
    chatHistory: []
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('bot_bj_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('bot_bj_user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email);
    
    if (foundUser && password === 'password123') {
      const updatedUser = { ...foundUser, lastLogin: new Date() };
      setUser(updatedUser);
      localStorage.setItem('bot_bj_user', JSON.stringify(updatedUser));
      
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${foundUser.name}!`,
      });
      
      setIsLoading(false);
      return true;
    }
    
    toast({
      title: "Erreur de connexion",
      description: "Email ou mot de passe incorrect",
      variant: "destructive",
    });
    
    setIsLoading(false);
    return false;
  };

  const loginWithPhone = async (phone: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.phone === phone);
    
    if (foundUser && password === 'password123') {
      const updatedUser = { ...foundUser, lastLogin: new Date() };
      setUser(updatedUser);
      localStorage.setItem('bot_bj_user', JSON.stringify(updatedUser));
      
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${foundUser.name}!`,
      });
      
      setIsLoading(false);
      return true;
    }
    
    toast({
      title: "Erreur de connexion",
      description: "Téléphone ou mot de passe incorrect",
      variant: "destructive",
    });
    
    setIsLoading(false);
    return false;
  };

  const register = async (userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: AuthUser = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: 'user',
      permissions: rolePermissions.user,
      status: 'active',
      createdAt: new Date(),
      subscription: {
        type: 'free',
        status: 'active'
      },
      chatHistory: []
    };
    
    mockUsers.push(newUser);
    setUser(newUser);
    localStorage.setItem('bot_bj_user', JSON.stringify(newUser));
    
    toast({
      title: "Compte créé avec succès",
      description: `Bienvenue ${newUser.name}!`,
    });
    
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bot_bj_user');
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('bot_bj_user', JSON.stringify(updatedUser));
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      loginWithPhone,
      register,
      logout,
      updateProfile,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
