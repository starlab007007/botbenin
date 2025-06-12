
import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, MessageCircle, Workflow, BarChart3, Briefcase, Megaphone, FolderOpen, Users, User, HelpCircle, Bot, Database, Sparkles, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { title: 'Dashboard', path: '/dashboard', icon: BarChart3, color: 'text-blue-600' },
  { title: 'Chat IA', path: '/chat', icon: MessageCircle, color: 'text-green-600' },
  { title: 'Mes Bots', path: '/bots', icon: Bot, color: 'text-purple-600' },
  { title: 'Prospects', path: '/prospects', icon: Database, color: 'text-orange-600' },
];

const automationItems = [
  { title: 'Automatisations', path: '/automations', icon: Workflow, color: 'text-violet-600' },
];

const aiModules = [
  { title: 'IA Business', path: '/business', icon: Briefcase, color: 'text-blue-600' },
  { title: 'IA Marketing', path: '/marketing', icon: Megaphone, color: 'text-pink-600' },
  { title: 'IA Gestion', path: '/gestion', icon: FolderOpen, color: 'text-indigo-600' },
  { title: 'IA Citoyen', path: '/citoyen', icon: Users, color: 'text-teal-600' },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User, color: 'text-gray-600' },
  { title: 'Support', path: '/support', icon: HelpCircle, color: 'text-red-600' },
];

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop avec blur */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-lg shadow-2xl transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Bot.Bj
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-80px)]">
          {/* Menu principal */}
          <div>
            <div className="flex items-center space-x-2 mb-3 px-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Principal
              </h3>
            </div>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Automatisations */}
          <div>
            <div className="flex items-center space-x-2 mb-3 px-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Automatisation
              </h3>
            </div>
            <ul className="space-y-2">
              {automationItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Modules IA */}
          <div>
            <div className="flex items-center space-x-2 mb-3 px-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Modules IA
              </h3>
            </div>
            <ul className="space-y-2">
              {aiModules.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="text-sm font-medium">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Éléments du bas */}
          <div className="border-t border-gray-200/50 pt-4">
            <ul className="space-y-2">
              {bottomItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gray-50 text-gray-700 shadow-sm border border-gray-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
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
