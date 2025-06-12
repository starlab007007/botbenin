
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
  Bot,
  Sparkles,
  Bell,
  Search
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

export const TopHeader: React.FC = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const hasAdminAccess = user?.permissions.includes('manage_users');

  return (
    <>
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50 shadow-sm">
        {/* Section gauche */}
        <div className="flex items-center space-x-4">
          {/* Bouton menu mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden hover:bg-blue-50 hover:text-blue-600 transition-colors"
            onClick={() => setShowMobileSidebar(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo moderne avec gradient */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center space-x-3 hover:opacity-80 transition-all duration-300 group"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Bot.Bj
              </h1>
              <p className="text-xs text-gray-500 -mt-1">IA Platform</p>
            </div>
          </button>
        </div>

        {/* Section centre - Barre de recherche moderne */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans la plateforme..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Section droite */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Notifications */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className="relative hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              </span>
            </Button>
          )}
          
          {/* Toggle thème */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 h-10 hover:bg-blue-50 transition-colors rounded-xl">
                  <Avatar className="h-8 w-8 ring-2 ring-blue-100">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                      {getUserInitials(user!.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-700">{user!.name}</p>
                    <p className="text-xs text-blue-600 capitalize flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {user!.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-lg border border-gray-200/50 shadow-xl rounded-xl">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user!.name}</p>
                  <p className="text-xs text-gray-500">{user!.email}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {user!.role}
                    </span>
                  </div>
                </div>
                
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center cursor-pointer hover:bg-blue-50 transition-colors">
                    <Home className="w-4 h-4 mr-3 text-blue-600" />
                    <span>Accueil</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center cursor-pointer hover:bg-purple-50 transition-colors">
                    <Bot className="w-4 h-4 mr-3 text-purple-600" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center cursor-pointer hover:bg-green-50 transition-colors">
                    <User className="w-4 h-4 mr-3 text-green-600" />
                    <span>Mon Profil</span>
                  </Link>
                </DropdownMenuItem>
                
                {hasAdminAccess && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/users" className="flex items-center cursor-pointer hover:bg-orange-50 transition-colors">
                        <Users className="w-4 h-4 mr-3 text-orange-600" />
                        <span>Gestion Utilisateurs</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4 mr-3" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Connexion
            </Button>
          )}
        </div>
      </header>

      {/* Sidebar mobile */}
      <MobileSidebar 
        isOpen={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Modal d'authentification */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};
