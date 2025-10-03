
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
  { title: 'Accueil', path: '/', icon: Home, color: 'bg-blue-500' },
  { title: 'Chat', path: '/chat', icon: MessageCircle, color: 'bg-green-500' },
  { title: 'Tableaux de bord', path: '/dashboard', icon: BarChart3, color: 'bg-gray-500' },
];

const aiModules = [
  { title: 'Agent IA Business', path: '/modules/business', icon: Briefcase, color: 'bg-blue-600' },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User, color: 'bg-gray-500' },
  { title: 'Aide / Support', path: '/support', icon: HelpCircle, color: 'bg-red-500' },
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
                      ? 'bg-gray-50 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`font-medium ${isActive(item.path) ? 'text-gray-900' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
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
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive(item.path)
                      ? 'bg-gray-50 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm font-medium ${isActive(item.path) ? 'text-gray-900' : 'text-gray-700'}`}>
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
                      ? 'bg-gray-50 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm font-medium ${isActive(item.path) ? 'text-gray-900' : 'text-gray-700'}`}>
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
