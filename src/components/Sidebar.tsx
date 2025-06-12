
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
  Sparkles,
  Zap,
  Database,
  TrendingUp,
  Shield
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', path: '/dashboard', icon: BarChart3, color: 'from-blue-500 to-blue-600', desc: 'Vue d\'ensemble' },
  { title: 'Chat IA', path: '/chat', icon: MessageCircle, color: 'from-green-500 to-green-600', desc: 'Conversation' },
  { title: 'Mes Bots', path: '/bots', icon: Bot, color: 'from-purple-500 to-purple-600', desc: 'Gestion bots' },
  { title: 'Prospects', path: '/prospects', icon: Database, color: 'from-orange-500 to-orange-600', desc: 'Base prospects' },
];

const aiModules = [
  { title: 'IA Business', path: '/business', icon: Briefcase, color: 'from-blue-600 to-indigo-600', desc: 'Solutions pro' },
  { title: 'IA Marketing', path: '/marketing', icon: Megaphone, color: 'from-pink-500 to-rose-600', desc: 'Campagnes' },
  { title: 'IA Gestion', path: '/gestion', icon: FolderOpen, color: 'from-indigo-500 to-purple-600', desc: 'Organisation' },
  { title: 'IA Citoyen', path: '/citoyen', icon: UsersIcon, color: 'from-teal-500 to-cyan-600', desc: 'Services publics' },
];

const automationItems = [
  { title: 'Automatisations', path: '/automations', icon: Workflow, color: 'from-violet-500 to-purple-600', desc: 'Flux auto' },
];

const bottomItems = [
  { title: 'Mon Compte', path: '/account', icon: User, color: 'from-gray-500 to-gray-600', desc: 'Profil' },
  { title: 'Support', path: '/support', icon: HelpCircle, color: 'from-red-500 to-red-600', desc: 'Aide' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const renderNavItem = (item: any, isCompact = false) => (
    <li key={item.path}>
      <NavLink
        to={item.path}
        className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 hover:shadow-md ${
          isActive(item.path)
            ? 'bg-white shadow-lg border border-gray-100'
            : 'hover:bg-white/50 hover:backdrop-blur-sm'
        }`}
      >
        <div className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 ${
          isActive(item.path) ? 'scale-110' : 'group-hover:scale-105'
        }`}>
          <item.icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-medium transition-colors ${
            isActive(item.path) ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
          } ${isCompact ? 'text-sm' : ''}`}>
            {item.title}
          </span>
          {!isCompact && (
            <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
              {item.desc}
            </p>
          )}
        </div>
        {isActive(item.path) && (
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        )}
      </NavLink>
    </li>
  );

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-white/90 to-gray-50/90 backdrop-blur-lg border-r border-gray-200/50 overflow-y-auto shadow-lg">
      {/* Navigation */}
      <nav className="p-4 space-y-8">
        {/* Menu principal */}
        <div>
          <div className="flex items-center space-x-2 mb-4 px-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
              Principal
            </h3>
          </div>
          <ul className="space-y-2">
            {menuItems.map(item => renderNavItem(item))}
          </ul>
        </div>

        {/* Automatisations */}
        <div>
          <div className="flex items-center space-x-2 mb-4 px-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
              Automatisation
            </h3>
          </div>
          <ul className="space-y-2">
            {automationItems.map(item => renderNavItem(item))}
          </ul>
        </div>

        {/* Modules IA */}
        <div>
          <div className="flex items-center space-x-2 mb-4 px-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
              Modules IA
            </h3>
          </div>
          <ul className="space-y-2">
            {aiModules.map(item => renderNavItem(item, true))}
          </ul>
        </div>

        {/* Espace pour push les éléments du bas */}
        <div className="flex-1"></div>

        {/* Éléments du bas */}
        <div className="border-t border-gray-200/50 pt-4">
          <ul className="space-y-2">
            {bottomItems.map(item => renderNavItem(item, true))}
          </ul>
        </div>

        {/* Badge de version */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Bot.Bj Pro</span>
          </div>
          <p className="text-xs text-blue-700">
            Plateforme IA complète
          </p>
        </div>
      </nav>
    </div>
  );
};
