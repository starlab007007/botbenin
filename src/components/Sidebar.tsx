
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
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <div className="fixed left-0 top-0 h-screen w-64 bot-bj-sidebar z-40">
      {/* Logo */}
      <div className="p-6 border-b border-border/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Bot.Bj</h1>
            <p className="text-sm text-muted-foreground font-body">Plateforme IA</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 font-body">
        {/* Main Menu */}
        <div>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`bot-bj-nav-item ${
                    isActive(item.path) ? 'active' : ''
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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2 font-body">
            Modules IA
          </h3>
          <ul className="space-y-2">
            {aiModules.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`bot-bj-nav-item secondary ${
                    isActive(item.path) ? 'active' : ''
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Theme Toggle */}
        <div className="px-2">
          <ThemeToggle />
        </div>

        {/* Bottom Items */}
        <div className="absolute bottom-4 left-4 right-4">
          <ul className="space-y-2">
            {bottomItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`bot-bj-nav-item accent ${
                    isActive(item.path) ? 'active' : ''
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};
