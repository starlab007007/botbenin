
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  Home,
  Users,
  BarChart3
} from 'lucide-react';
import { MobileSidebar } from '@/components/MobileSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const TopHeader: React.FC = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const hasAdminAccess = user?.permissions.includes('manage_users') || user?.role === 'admin';

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowMobileSidebar(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">Bot.Bj</span>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 h-10 hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
                      {getUserInitials(user!.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user!.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user!.email}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-200 shadow-lg">
                <div className="px-3 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user!.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{user!.email}</p>
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getRoleColor(user!.role)}`}>
                      {user!.role.charAt(0).toUpperCase() + user!.role.slice(1)}
                    </Badge>
                    {user!.authProvider === 'google' && (
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                        Google
                      </Badge>
                    )}
                    {user!.emailVerified && (
                      <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs">
                        Vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Abonnement: <span className="font-medium capitalize">{user!.subscription?.type}</span>
                  </div>
                </div>
                
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center cursor-pointer">
                    <Home className="w-4 h-4 mr-2" />
                    Accueil
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center cursor-pointer">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Tableau de bord
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Mon Profil
                  </Link>
                </DropdownMenuItem>
                
                {hasAdminAccess && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/users" className="flex items-center cursor-pointer">
                        <Users className="w-4 h-4 mr-2" />
                        Gestion Utilisateurs
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/test-accounts" className="flex items-center cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Comptes de Test
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Connexion
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};
