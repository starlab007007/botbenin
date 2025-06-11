
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  Settings,
  Database
} from 'lucide-react';

const menuItems = [
  { title: 'Accueil', path: '/', icon: Home, color: 'bg-blue-500' },
  { title: 'Chat', path: '/chat', icon: MessageCircle, color: 'bg-green-500' },
  { title: 'Automatisations', path: '/automatisations', icon: Workflow, color: 'bg-purple-500' },
  { title: 'Tableaux de bord', path: '/dashboard', icon: BarChart3, color: 'bg-gray-500' },
  { title: 'Prospects', path: '/prospects', icon: Database, color: 'bg-cyan-500' },
];

const aiModules = [
  { title: 'Agent IA Business', path: '/modules/business', icon: Briefcase, color: 'bg-blue-600' },
  { title: 'Agent IA Marketing', path: '/modules/marketing', icon: Megaphone, color: 'bg-pink-500' },
  { title: 'Agent IA Gestion', path: '/modules/gestion', icon: FolderOpen, color: 'bg-indigo-500' },
  { title: 'IA Citoyen', path: '/modules/citoyen', icon: UsersIcon, color: 'bg-teal-500' },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User, color: 'bg-gray-500' },
  { title: 'Aide / Support', path: '/support', icon: HelpCircle, color: 'bg-red-500' },
];

const adminItems = [
  { title: 'Gestion Utilisateurs', path: '/users', icon: UsersIcon, color: 'bg-orange-500' },
  { title: 'Comptes de Test', path: '/test-accounts', icon: Settings, color: 'bg-purple-600' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const hasAdminAccess = user?.role === 'admin' || user?.permissions?.includes('manage_users');

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
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

        {/* AI Modules - Toujours visibles, mais avec protection d'accès */}
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
                  } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm font-medium ${isActive(item.path) ? 'text-gray-900' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                  {!isAuthenticated && (
                    <span className="text-xs text-gray-400 ml-auto">Connexion requise</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Admin Section */}
        {isAuthenticated && hasAdminAccess && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Administration
            </h3>
            <ul className="space-y-2">
              {adminItems.map((item) => (
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
        )}
      </nav>

      {/* Bottom Items - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <ul className="space-y-2">
          {bottomItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive(item.path)
                    ? 'bg-gray-50 shadow-sm'
                    : 'hover:bg-gray-50'
                } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${isActive(item.path) ? 'text-gray-900' : 'text-gray-700'}`}>
                  {item.title}
                </span>
                {!isAuthenticated && (
                  <span className="text-xs text-gray-400 ml-auto">Connexion requise</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
