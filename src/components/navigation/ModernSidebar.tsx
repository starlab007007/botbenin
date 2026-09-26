
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Activity,
  Truck,
  Sparkles,
  History,
  SlidersHorizontal,
  HeartPulse,
  Megaphone,
  Network,
  MessageSquareText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const isActive = (path: string) => {
    const routePath = path.split('?')[0];
    if (routePath === '/home') {
      return location.pathname === '/' || location.pathname === '/home';
    }
    if (routePath === '/admin') {
      return location.pathname === '/admin';
    }
    if (routePath === '/admin/waouh') {
      const expectedTab = new URLSearchParams(path.split('?')[1] || '').get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab') || 'control';
      if (expectedTab) return location.pathname === routePath && currentTab === expectedTab;
      return location.pathname === routePath;
    }
    return location.pathname.startsWith(routePath);
  };

  const NavItem = ({ item, showDescription = false, requireAuth = false }: { item: any; showDescription?: boolean; requireAuth?: boolean }) => {
    const needsAuth = requireAuth && !user;
    const handleClick = (e: React.MouseEvent) => {
      if (needsAuth) {
        e.preventDefault();
        setPendingPath(item.path);
        setAuthOpen(true);
        return;
      }
      onClose();
    };
    return (
      <NavLink
        to={item.path}
        onClick={handleClick}
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
  };

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
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                Administration générale
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
                  <div>
                    <div className="font-medium text-gray-800">Administration</div>
                    <div className="text-xs text-gray-500">Utilisateurs, rôles et permissions</div>
                  </div>
                </NavLink>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                WAOUH — Pilotage
              </h3>
              <div className="space-y-2">
                <NavItem item={{ title: 'Centre de contrôle', path: '/admin/waouh?tab=control', icon: Activity, color: 'from-cyan-600 to-blue-700', description: 'État global, alertes & kill switches' }} showDescription />
                <NavItem item={{ title: 'Monitoring temps réel', path: '/admin/waouh/monitoring', icon: Activity, color: 'from-rose-500 to-red-600', description: 'Santé & métriques opérationnelles' }} showDescription />
                <NavItem item={{ title: 'Health Check', path: '/admin/waouh/health-check', icon: HeartPulse, color: 'from-emerald-500 to-teal-600', description: 'Divergences, synchro & anomalies' }} showDescription />
                <NavItem item={{ title: 'Historique & traces', path: '/admin/waouh/historique', icon: History, color: 'from-slate-500 to-slate-700', description: 'Chat, négociations, queue & traces' }} showDescription />
                <NavItem item={{ title: 'Deal Ops', path: '/admin/waouh/deals', icon: Truck, color: 'from-orange-500 to-amber-600', description: 'Deals, livraison, paiement & arbitrage' }} showDescription />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                WAOUH — Architecture
              </h3>
              <div className="space-y-2">
                <NavItem item={{ title: 'NEXUS', path: '/admin/waouh?tab=control&module=nexus', icon: Network, color: 'from-purple-500 to-pink-600', description: 'Signal Fabric & automatisation' }} showDescription />
                <NavItem item={{ title: 'Contact Layer C0–C4', path: '/admin/waouh?tab=radar&radarTab=contact', icon: Shield, color: 'from-cyan-500 to-blue-600', description: 'Contactabilité par source' }} showDescription />
                <NavItem item={{ title: 'Avatar Commerce', path: '/admin/waouh?tab=control&module=avatar_commerce', icon: Sparkles, color: 'from-fuchsia-500 to-purple-600', description: 'Acheter / Vendre / Demander' }} showDescription />
                <NavItem item={{ title: 'Chat Web / App', path: '/admin/waouh?tab=control&module=chat_web', icon: MessageSquareText, color: 'from-sky-500 to-blue-600', description: 'Canal Web & App' }} showDescription />
                <NavItem item={{ title: 'WhatsApp', path: '/admin/waouh?tab=control&module=chat_whatsapp', icon: MessageSquareText, color: 'from-green-500 to-emerald-600', description: 'Canal WAHA' }} showDescription />
                <NavItem item={{ title: 'Muse / Agents IA', path: '/admin/waouh?tab=control&module=muse_agents', icon: Bot, color: 'from-indigo-500 to-violet-600', description: 'Missions & automatisations' }} showDescription />
                <NavItem item={{ title: 'Négociation', path: '/admin/waouh?tab=control&module=negotiation', icon: TrendingUp, color: 'from-amber-500 to-orange-600', description: 'Offres & contre-offres' }} showDescription />
                <NavItem item={{ title: 'Deal Room / Graph', path: '/admin/waouh?tab=control&module=deals', icon: Truck, color: 'from-orange-500 to-red-600', description: 'Paiement, livraison & litiges' }} showDescription />
                <NavItem item={{ title: 'Outbound', path: '/admin/waouh?tab=control&module=outbound', icon: Megaphone, color: 'from-rose-500 to-pink-600', description: 'Queue & dispatch' }} showDescription />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                WAOUH — Paramétrage
              </h3>
              <div className="space-y-2">
                <NavItem item={{ title: 'Paramètres généraux', path: '/admin/waouh?tab=settings', icon: SlidersHorizontal, color: 'from-indigo-500 to-violet-600', description: 'IA, commerce, paiement & règles' }} showDescription />
                <NavItem item={{ title: 'NEXUS / Radar IA', path: '/admin/waouh?tab=radar', icon: Network, color: 'from-purple-500 to-pink-600', description: 'Sources, API, quotas & collecte' }} showDescription />
                <NavItem item={{ title: 'WhatsApp Ops', path: '/admin/waouh/whatsapp-ops', icon: Settings2, color: 'from-green-600 to-emerald-700', description: 'WAHA, sessions, queue & replay' }} showDescription />
                <NavItem item={{ title: 'SMS / RCS natif', path: '/admin/waouh/native-messaging', icon: MessageSquareText, color: 'from-sky-500 to-cyan-600', description: 'Provider, SMS, RCS & fallback' }} showDescription />
                <NavItem item={{ title: 'Validations diffusion', path: '/admin/waouh/diffusion-approvals', icon: Megaphone, color: 'from-fuchsia-500 to-pink-600', description: 'Approbations humaines avant envoi' }} showDescription />
                <NavItem item={{ title: 'Catalogue & données', path: '/admin/waouh/data-control', icon: Database, color: 'from-emerald-500 to-teal-600', description: 'Qualité, normalisation & contrôle IA' }} showDescription />
                <NavItem item={{ title: 'Partenaires', path: '/admin/waouh/partners', icon: Handshake, color: 'from-amber-500 to-orange-600', description: 'Gérer les partenaires WAOUH' }} showDescription />
                <NavItem item={{ title: 'Commerces', path: '/admin/waouh/businesses', icon: Building2, color: 'from-blue-500 to-indigo-600', description: 'Entreprises, catalogues & vérification' }} showDescription />
                <NavItem item={{ title: 'Démo / recette', path: '/admin/waouh/demo', icon: Sparkles, color: 'from-fuchsia-500 to-purple-600', description: 'Parcours de démonstration' }} showDescription />
              </div>
            </div>
          </div>
        )}



        {/* Waouh Partner — visible à tous, login requis au clic */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Waouh Partner
          </h3>
          <div className="space-y-2">
            <NavItem requireAuth item={{ title: 'Espace Partner', path: '/partner', icon: Handshake, color: 'from-amber-500 to-orange-500', description: 'Tableau de bord', badge: 'New' }} showDescription />
            <NavItem requireAuth item={{ title: 'Mes entreprises', path: '/partner/businesses', icon: Building2, color: 'from-blue-500 to-indigo-600', description: 'Enrôler des commerces' }} showDescription />
            <NavItem requireAuth item={{ title: 'Mes ventes', path: '/partner/sales', icon: TrendingUp, color: 'from-green-500 to-emerald-600', description: 'Commissions' }} showDescription />
            <NavItem requireAuth item={{ title: 'Mes versements', path: '/partner/payouts', icon: Wallet, color: 'from-purple-500 to-pink-600', description: 'Historique paiements' }} showDescription />
          </div>
        </div>

        {/* Mon Compte */}
        <div className="pt-4">
          <div className="space-y-2">
            {bottomItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false);
          if (pendingPath && user) {
            navigate(pendingPath);
            onClose();
          }
          setPendingPath(null);
        }}
      />
    </div>
  );
};
