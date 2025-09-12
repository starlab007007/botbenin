
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  Workflow, 
  BarChart3, 
  Briefcase, 
  Megaphone, 
  FolderOpen, 
  Users as UsersIcon, 
  User, 
  HelpCircle,
  Bot,
  Database,
  Settings,
  Zap,
  Target,
  Building,
  Shield,
  X,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface ModernSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const mainMenuItems = [
  { 
    title: 'Accueil', 
    path: '/home', 
    icon: Home, 
    color: 'from-blue-500 to-blue-600',
    description: 'Vue d\'ensemble'
  },
  { 
    title: 'Kpakpato', 
    path: '/chat', 
    icon: MessageCircle, 
    color: 'from-green-500 to-green-600',
    description: 'Messages vocaux interactifs'
  },
  { 
    title: 'Dashboard', 
    path: '/dashboard', 
    icon: BarChart3, 
    color: 'from-purple-500 to-purple-600',
    description: 'Tableaux de bord'
  },
];

const botManagementItems = [
  { 
    title: 'Mes Bots', 
    path: '/bots', 
    icon: Bot, 
    color: 'from-indigo-500 to-indigo-600',
    badge: 'Pro'
  },
  { 
    title: 'Automatisations', 
    path: '/automations', 
    icon: Zap, 
    color: 'from-orange-500 to-orange-600',
    badge: 'New'
  },
];

const marketingItems = [
  { 
    title: 'WhatsApp Connect', 
    path: '/whatsapp-connect', 
    icon: Phone, 
    color: 'from-green-500 to-green-600',
    description: 'Connexion WhatsApp',
    badge: 'New'
  },
];

const crmItems = [
  { 
    title: 'Prospects', 
    path: '/prospects', 
    icon: Target, 
    color: 'from-pink-500 to-pink-600',
    description: 'Gestion CRM'
  },
];

const aiModules = [
  { 
    title: 'IA Business', 
    path: '/modules/business', 
    icon: Briefcase, 
    color: 'from-blue-600 to-blue-700',
    description: 'Solutions B2B'
  },
];

const bottomItems = [
  { 
    title: 'Support', 
    path: '/support', 
    icon: HelpCircle, 
    color: 'from-gray-500 to-gray-600' 
  },
  { 
    title: 'Mon Compte', 
    path: '/account', 
    icon: User, 
    color: 'from-gray-500 to-gray-600' 
  },
];

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/' || location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  const hasAdminAccess = user?.permissions.includes('manage_users');

  const NavItem = ({ item, showDescription = false }: { item: any; showDescription?: boolean }) => (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={`group flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
        isActive(item.path)
          ? 'bg-white shadow-md border border-gray-100'
          : 'hover:bg-white/60 hover:shadow-sm'
      }`}
    >
      <div className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
        <item.icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`font-medium truncate ${
            isActive(item.path) ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {item.title}
          </span>
          {item.badge && (
            <Badge variant="secondary" className="ml-2 text-xs px-2 py-0.5">
              {item.badge}
            </Badge>
          )}
        </div>
        {showDescription && item.description && (
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
        )}
      </div>
      {isActive(item.path) && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full"></div>
      )}
    </NavLink>
  );

  return (
    <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 overflow-y-auto transform transition-transform duration-300 ease-out z-40 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0`}>
      
      {/* Header mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <nav className="p-4 space-y-8">
        {/* Menu Principal */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Menu Principal
          </h3>
          <div className="space-y-2">
            {mainMenuItems.map((item) => (
              <NavItem key={item.path} item={item} showDescription />
            ))}
          </div>
        </div>

        {/* Gestion des Bots */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Bots & Automatisation
          </h3>
          <div className="space-y-2">
            {botManagementItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </div>

        {/* WhatsApp */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Communication
          </h3>
          <div className="space-y-2">
            {marketingItems.map((item) => (
              <NavItem key={item.path} item={item} showDescription />
            ))}
          </div>
        </div>

        {/* CRM */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            CRM & Prospects
          </h3>
          <div className="space-y-2">
            {crmItems.map((item) => (
              <NavItem key={item.path} item={item} showDescription />
            ))}
          </div>
        </div>

        {/* Modules IA */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Modules IA Spécialisés
          </h3>
          <div className="space-y-2">
            {aiModules.map((item) => (
              <NavItem key={item.path} item={item} showDescription />
            ))}
          </div>
        </div>

        {/* Administration */}
        {hasAdminAccess && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
              Administration
            </h3>
            <div className="space-y-2">
              <NavLink
                to="/admin/users"
                onClick={onClose}
                className={`group flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive('/admin/users')
                    ? 'bg-white shadow-md border border-gray-100'
                    : 'hover:bg-white/60 hover:shadow-sm'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className={`font-medium ${
                  isActive('/admin/users') ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  Utilisateurs
                </span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Support & Compte */}
        <div className="border-t border-gray-200 pt-6">
          <div className="space-y-2">
            {bottomItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};
