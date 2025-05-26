
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
  HelpCircle
} from 'lucide-react';

const menuItems = [
  { title: 'Accueil', path: '/', icon: Home },
  { title: 'Chat', path: '/chat', icon: MessageCircle },
  { title: 'Automatisations', path: '/automatisations', icon: Workflow },
  { title: 'Tableaux de bord', path: '/dashboard', icon: BarChart3 },
];

const aiModules = [
  { title: 'Agent IA Business', path: '/modules/business', icon: Briefcase },
  { title: 'Agent IA Marketing', path: '/modules/marketing', icon: Megaphone },
  { title: 'Agent IA Gestion', path: '/modules/gestion', icon: FolderOpen },
  { title: 'IA Citoyen', path: '/modules/citoyen', icon: UsersIcon },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User },
  { title: 'Aide / Support', path: '/support', icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      {/* Navigation */}
      <nav className="p-4 space-y-6">
        {/* Main Menu */}
        <div>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive(item.path)
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">
                    {item.title}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* AI Modules */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 px-2">
            Modules IA
          </h3>
          <ul className="space-y-2">
            {aiModules.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive(item.path)
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">
                    {item.title}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom Items */}
        <div className="absolute bottom-4 left-4 right-4">
          <ul className="space-y-2">
            {bottomItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive(item.path)
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">
                    {item.title}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};
