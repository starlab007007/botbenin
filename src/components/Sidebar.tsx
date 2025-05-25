
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  Workflow, 
  BarChart3, 
  Brain, 
  Briefcase, 
  Megaphone, 
  FolderOpen, 
  Users, 
  User, 
  HelpCircle,
  Bot
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
  { title: 'IA Citoyen', path: '/modules/citoyen', icon: Users },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User },
  { title: 'Aide / Support', path: '/support', icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Bot.Bj</h1>
            <p className="text-sm text-slate-400">Plateforme IA</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {/* Main Menu */}
        <div>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* AI Modules */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Modules IA
          </h3>
          <ul className="space-y-2">
            {aiModules.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.title}</span>
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
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};
