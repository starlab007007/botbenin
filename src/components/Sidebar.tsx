
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Database,
  MessageCircle,
  User, 
  HelpCircle
} from 'lucide-react';
import { Bot, Target, ShoppingBag } from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', path: '/dashboard', icon: BarChart3, color: 'bg-purple-500' },
  { title: 'Mes Bots', path: '/bots', icon: Bot, color: 'bg-indigo-500' },
  { title: 'Création Bots', path: '/knowledge-bases', icon: Database, color: 'bg-cyan-500' },
  { title: 'CRM', path: '/prospects', icon: Target, color: 'bg-pink-500' },
  { title: 'WhatsApp IA', path: '/whatsapp-connect', icon: MessageCircle, color: 'bg-green-500' },
  { title: 'WhatsApp Diffusion', path: '/whatsapp-diffusion', icon: MessageCircle, color: 'bg-emerald-600' },
  { title: 'WAOUH', path: '/waouh', icon: ShoppingBag, color: 'bg-cyan-400', badge: 'NOUVEAU' },
];

// HIDDEN - kept for future use
// const hiddenItems = [
//   { title: 'Accueil', path: '/', icon: Home, color: 'bg-blue-500' },
//   { title: 'Chat', path: '/chat', icon: MessageCircle, color: 'bg-green-500' },
//   { title: 'Agent IA Business', path: '/modules/business', icon: Briefcase, color: 'bg-blue-600' },
// ];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User, color: 'bg-gray-500' },
  { title: 'Aide / Support', path: '/support', icon: HelpCircle, color: 'bg-red-500' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-6">
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
