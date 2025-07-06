
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  BarChart3, 
  Bot, 
  Zap, 
  Share2, 
  Briefcase, 
  TrendingUp, 
  Settings, 
  Users2, 
  HelpCircle, 
  User,
  Shield,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/UserContext';

interface ModernSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { name: 'Accueil', href: '/home', icon: Home },
  { name: 'Chat IA', href: '/chat', icon: MessageSquare },
  { name: 'Tableau de bord', href: '/dashboard', icon: BarChart3 },
  { name: 'Mes Bots', href: '/bots', icon: Bot },
  { name: 'Automatisations', href: '/automations', icon: Zap },
  { name: 'Campagnes', href: '/social-campaigns', icon: Share2 },
  { name: 'Prospects', href: '/prospects', icon: Users2 },
];

const modules = [
  { name: 'Business', href: '/modules/business', icon: Briefcase },
  { name: 'Marketing', href: '/modules/marketing', icon: TrendingUp },
  { name: 'Gestion', href: '/modules/gestion', icon: Settings },
  { name: 'Citoyen', href: '/modules/citoyen', icon: Users2 },
];

const bottomItems = [
  { name: 'Support', href: '/support', icon: HelpCircle },
  { name: 'Mon Compte', href: '/account', icon: User },
];

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAdmin } = useUser();

  // Ajouter l'administration pour les admins
  const adminItems = isAdmin ? [
    { name: 'Administration', href: '/admin', icon: Shield },
  ] : [];

  const allBottomItems = [...bottomItems, ...adminItems];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">Bot.bj</span>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Modules Section */}
        <div className="pt-6">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Modules IA
          </h3>
          <div className="space-y-1">
            {modules.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 p-4 space-y-1">
        {allBottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full top-16 z-30">
        {sidebarContent}
      </div>
    </div>
  );
};
