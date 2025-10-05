
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  Search,
  Bell,
  Settings,
  User, 
  LogOut, 
  Shield, 
  Home,
  Users,
  Command,
  Palette
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { useNotifications } from '@/hooks/useNotifications';
import { BotBjLogo } from '@/components/ui/BotBjLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface ModernTopHeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export const ModernTopHeader: React.FC<ModernTopHeaderProps> = ({ 
  onMenuClick, 
  sidebarOpen 
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    navigate('/home');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUserInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const hasAdminAccess = !!user?.permissions?.includes?.('manage_users');
  const { unreadCount, requestNotificationPermission } = useNotifications();

  // Request notification permission on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isAuthenticated, requestNotificationPermission]);

  const quickActions = [
    { name: 'Accueil', path: '/home', icon: Home },
    { name: 'Kpakpato', path: '/chat', icon: Command },
    { name: 'Dashboard', path: '/dashboard', icon: Palette },
    { name: 'Bots', path: '/bots', icon: Settings },
    { name: 'Prospects', path: '/prospects', icon: Users },
  ];

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandDialog((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 shadow-sm">
        {/* Gauche */}
        <div className="flex items-center space-x-4">
          {/* Bouton menu mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <BotBjLogo 
              variant="compact"
              className="h-10 w-auto text-primary hidden sm:block"
            />
            <BotBjLogo 
              variant="icon"
              className="h-8 w-8 text-primary sm:hidden"
            />
          </button>
        </div>

        {/* Centre - Barre de recherche */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher... (Ctrl+K)"
              className="pl-10 pr-4 w-full bg-gray-50 border-gray-200 focus:bg-white"
              onClick={() => setShowCommandDialog(true)}
              readOnly
            />
            <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Droite */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Recherche mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setShowCommandDialog(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          )}

          <ThemeToggle />
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="flex items-center space-x-2 h-10">
                   <Avatar className="h-8 w-8">
                     <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                       {getUserInitials(user?.name)}
                     </AvatarFallback>
                   </Avatar>
                   <span className="hidden sm:block text-sm font-medium text-gray-700">
                     {user?.name || 'Utilisateur'}
                   </span>
                 </Button>
              </DropdownMenuTrigger>
              
               <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
                 <div className="px-3 py-2 border-b border-gray-100">
                   <p className="text-sm font-medium text-gray-900">{user?.name || 'Utilisateur'}</p>
                   <p className="text-xs text-gray-500">{user?.email || ''}</p>
                   <p className="text-xs text-blue-600 capitalize mt-1">{user?.role || 'user'}</p>
                 </div>
                
                <DropdownMenuItem asChild>
                  <Link to="/home" className="flex items-center cursor-pointer">
                    <Home className="w-4 h-4 mr-2" />
                    Accueil
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Mon Profil
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                
                {hasAdminAccess && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/users" className="flex items-center cursor-pointer">
                        <Users className="w-4 h-4 mr-2" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
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

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />

      {/* Command Dialog */}
      <CommandDialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
        <CommandInput placeholder="Rechercher des fonctionnalités..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Actions rapides">
            {quickActions.map((action) => (
              <CommandItem
                key={action.path}
                onSelect={() => {
                  navigate(action.path);
                  setShowCommandDialog(false);
                }}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span>{action.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
