
import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, MessageCircle, Workflow, BarChart3, Briefcase, Megaphone, FolderOpen, Users, User, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { title: 'Accueil', path: '/', icon: Home },
  { title: 'Chat', path: '/chat', icon: MessageCircle },
  { title: 'Automatisations', path: '/automatisations', icon: Workflow },
  { title: 'Tableaux de bord', path: '/dashboard', icon: BarChart3 },
];

const aiModules = [
  { title: 'Agent IA Business', path: '/modules/business', icon: Briefcase },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User },
  { title: 'Aide / Support', path: '/support', icon: HelpCircle },
];

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-80px)]">
          {/* Main Menu */}
          <div>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Modules */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Modules IA
            </h3>
            <ul className="space-y-2">
              {aiModules.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-50 text-purple-600 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Items */}
          <div>
            <ul className="space-y-2">
              {bottomItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-green-50 text-green-600 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
