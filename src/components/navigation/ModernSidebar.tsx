
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { 
  BarChart3, 
  Bot,
  Database,
  Target,
  ShoppingBag,
  User, 
  Shield,
  X,
  Handshake,
  Building2,
  TrendingUp,
  Wallet,
  Radar,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import whatsappIcon from '@/assets/whatsapp-icon.png';

interface ModernSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const mainMenuItems = [
  { 
    title: 'Dashboard', 
    path: '/dashboard', 
    icon: BarChart3, 
    color: 'from-purple-500 to-purple-600',
    description: 'Tableaux de bord'
  },
  { 
    title: 'Mes Bots', 
    path: '/bots', 
    icon: Bot, 
    color: 'from-indigo-500 to-indigo-600',
    badge: 'Pro'
  },
  {
    title: 'Création Bots',
    path: '/knowledge-bases',
    icon: Database,
    color: 'from-cyan-500 to-cyan-600',
    description: 'Bases de connaissances'
  },
  { 
    title: 'CRM', 
    path: '/prospects', 
    icon: Target, 
    color: 'from-pink-500 to-pink-600',
    description: 'Prospects & Clients'
  },
  { 
    title: 'WhatsApp IA', 
    path: '/whatsapp-connect', 
    icon: 'image' as any,
    iconImage: whatsappIcon,
    color: 'from-green-500 to-green-600',
    description: 'Connexion WhatsApp',
    badge: 'New'
  },
  { 
    title: 'WhatsApp Diffusion', 
    path: '/whatsapp-diffusion', 
    icon: 'image' as any,
    iconImage: whatsappIcon,
    color: 'from-green-600 to-emerald-600',
    description: 'Campagnes de diffusion',
    badge: 'New'
  },
  {
    title: 'WAOUH Chat',
    path: '/waouh-chat',
    icon: ShoppingBag,
    color: 'from-cyan-500 to-blue-500',
    description: 'Acheter · Vendre · Négocier · Payer',
    badge: 'New'
  },
];

// HIDDEN - kept for future use
// const hiddenMenuItems = [
//   { title: 'Accueil', path: '/home', icon: Home, color: 'from-blue-500 to-blue-600', description: 'Vue d\'ensemble' },
//   { title: 'Kpakpato', path: '/chat', icon: MessageCircle, color: 'from-green-500 to-green-600', description: 'Messages vocaux interactifs' },
// ];
// const hiddenBotItems = [
//   { title: 'Création Bots', path: '/knowledge-bases', icon: Database, color: 'from-cyan-500 to-cyan-600', description: 'Bases de Connaissances' },
// ];
// const hiddenCrmItems = [
//   { title: 'IA Prospect Rapport Pre-Call', path: '/ia-prospect-precall', icon: FileText, color: 'from-blue-500 to-purple-600', description: 'Préparation d\'appels B2B', badge: 'New' },
//   { title: 'IA Business', path: '/modules/business', icon: Briefcase, color: 'from-blue-600 to-blue-700', description: 'Solutions B2B' },
// ];
// const hiddenAiModules = [
//   { title: 'IA Créateur Visuel', path: '/modules/visual-creator', icon: Wand2, color: 'from-purple-600 to-pink-600', description: 'Création de contenu visuel', badge: 'New' },
// ];
// const hiddenResourceItems = [
//   { title: 'Fonctionnalités', path: '/features', icon: Zap, color: 'from-orange-500 to-orange-600', description: 'Découvrir toutes les fonctionnalités' },
// ];

const bottomItems = [
  { 
    title: 'Mon Compte', 
    path: '/account', 
    icon: User, 
    color: 'from-gray-500 to-gray-600' 
  },
];

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/' || location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ item, showDescription = false }: { item: any; showDescription?: boolean }) => (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={`group flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
        isActive(item.path)
          ? 'bg-white shadow-md border border-gray-100'
          : 'hover:bg-white/60 hover:shadow-sm'
      }`}
    >
      <div className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow overflow-hidden`}>
        {item.iconImage ? (
          <img src={item.iconImage} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <item.icon className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`font-medium truncate ${
            isActive(item.path) ? 'text-gray-900' : 'text-gray-700'
          }`}>
            {item.title}
          </span>
          {item.badge && (
            <Badge variant="secondary" className="ml-2 text-xs px-2 py-0.5">
              {item.badge}
            </Badge>
          )}
        </div>
        {showDescription && item.description && (
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
        )}
      </div>
      {isActive(item.path) && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full"></div>
      )}
    </NavLink>
  );

  return (
    <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 overflow-y-auto transform transition-transform duration-300 ease-out z-40 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0`}>
      
      {/* Header mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <nav className="p-4 space-y-8">
        {/* Menu Principal - 4 modules uniquement */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Menu Principal
          </h3>
          <div className="space-y-2">
            {mainMenuItems.map((item) => (
              <NavItem key={item.path} item={item} showDescription />
            ))}
          </div>
        </div>

        {/* Administration - Only for admins */}
        {isAdmin && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
              Administration
            </h3>
            <div className="space-y-2">
              <NavLink
                to="/admin"
                onClick={onClose}
                className={`group flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive('/admin')
                    ? 'bg-white shadow-md border border-gray-100'
                    : 'hover:bg-white/60 hover:shadow-sm'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className={`font-medium ${
                  isActive('/admin') ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  Administration
                </span>
              </NavLink>
              <NavItem item={{ title: 'WAOUH Admin', path: '/waouh', icon: ShoppingBag, color: 'from-cyan-600 to-blue-700', description: 'Tableau de bord marketplace' }} showDescription />
            </div>
          </div>
        )}

        {/* Mon Compte */}
        <div className="pt-4">
          <div className="space-y-2">
            {bottomItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};
