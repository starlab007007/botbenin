import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  BarChart3,
  Bell,
  BrainCircuit,
  BookOpenText,
  Bot,
  GraduationCap,
  MessagesSquare,
  Radar as RadarIcon,

  ChevronLeft,
  ChevronRight,
  CircleDot,
  Command,
  Handshake,
  Megaphone,
  MessageSquareText,
  Package,
  QrCode,
  Search,

  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UsersRound,
  Workflow,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useMobileAuth } from '@/app-mobile/hooks/useMobileAuth';
import { useMobileProfile } from '@/app-mobile/hooks/useMobileProfile';

import { CenterCanvas } from './CenterCanvas';
import { ErpBrickCanvas, preloadBrick, type BrickId } from './ErpBrickCanvas';

import './erp-theme.css';

type WebErpShellProps = {
  children: ReactNode;
  unreadChat?: number;
};

type NavigationItem = {
  label: string;
  to: string;
  icon: typeof MessageSquareText;
  /** When set, the item swaps the central canvas instead of navigating. */
  brick?: BrickId;
  accent?: 'chat' | 'ai' | 'stock' | 'bi' | 'store';
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const HOME_PATH = '/';
const CHAT_PATH = '/app/chat';

const navigationSections: NavigationSection[] = [
  {
    title: 'Communication',
    items: [
      { label: 'Chat Command Center', to: CHAT_PATH, icon: MessageSquareText, accent: 'chat' },
      { label: 'Radar', to: '/?tab=radar', icon: RadarIcon, brick: 'radar' },
      { label: 'WhatsApp IA', to: '/app/whatsapp', icon: UsersRound, brick: 'whatsapp' },
      { label: 'Diffusion', to: '/app/diffusion', icon: Megaphone, brick: 'diffusion' },
    ],
  },
  {
    title: 'Agents IA',
    items: [
      { label: 'Avatar', to: '/app/avatar', icon: Sparkles, accent: 'ai' },
      { label: 'Missions & veille', to: '/app/missions', icon: Workflow, accent: 'ai' },
      { label: 'Bots', to: '/app/bots', icon: Bot, brick: 'bots', accent: 'ai' },
      { label: 'Agents IA', to: '/app/agents', icon: Sparkles, brick: 'agents', accent: 'ai' },
      { label: 'Conversationnel', to: '/app/bots/new', icon: MessagesSquare, brick: 'conversational' },
      { label: 'BI WAOUH IA', to: '/app/agents/bi', icon: BarChart3, brick: 'bi', accent: 'bi' },
      { label: 'Stock WAOUH IA', to: '/app/agents/stock', icon: Package, brick: 'stock', accent: 'stock' },
      { label: 'Présence QR', to: '/app/agents/attendance', icon: QrCode, brick: 'presence' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Boutiques & magasins', to: '/app/partner/businesses', icon: Store, brick: 'store', accent: 'store' },
      { label: 'Ventes', to: '/app/partner/sales', icon: ShoppingCart, brick: 'sales' },
      { label: 'Partenaires', to: '/app/partner', icon: Handshake, brick: 'partner' },
    ],
  },
  {
    title: 'Services IA',
    items: [
      { label: 'AprèsBac IA', to: '/app/apres-bac', icon: GraduationCap, brick: 'apresbac' },
      { label: 'FA IA', to: '/app/fa', icon: BookOpenText, brick: 'fa' },
    ],
  },
];

const navigation: NavigationItem[] = navigationSections.flatMap((section) => section.items);



const routeContext = (pathname: string) => {
  if (pathname.includes('tab=radar')) {
    return {
      eyebrow: 'Détection locale',
      title: 'Radar WAOUH',
      description: 'Opportunités et signaux à proximité, en temps réel.',
      prompt: 'Demander à WAOUH les opportunités proches',
    };
  }
  if (pathname.startsWith('/app/apres-bac') || pathname.startsWith('/app/apresbac')) {
    return {
      eyebrow: 'Orientation',
      title: 'AprèsBac IA',
      description: 'Analyse de profil, éligibilité et recommandations post-BAC.',
      prompt: 'Demander à AprèsBac IA une recommandation',
    };
  }
  if (pathname.startsWith('/app/fa')) {
    return {
      eyebrow: 'Consultation',
      title: 'FA IA',
      description: 'Lecture contextuelle, quota journalier et codes d’accès.',
      prompt: 'Ouvrir une consultation FA IA',
    };
  }
  if (pathname.startsWith('/app/missions')) {
    return {
      eyebrow: 'Pilotage agentique',
      title: 'WAOUH One · Missions & veille',
      description: 'Objectifs persistants, veilles, validations, règles vendeur et activité.',
      prompt: 'Ouvrir les missions',
    };
  }
  if (pathname.startsWith('/app/avatar') || pathname.startsWith('/app/muse')) {
    return {
      eyebrow: 'Intelligence commerciale',
      title: 'WAOUH Avatar',
      description: 'Votre Avatar recherche, compare, contacte sous contrôle et conduit les deals avec NEXUS.',
      prompt: 'Ouvrir mon Avatar',
    };
  }
  if (pathname === HOME_PATH) {
    return {
      eyebrow: 'Intelligence personnelle',
      title: 'Ayo · Votre Avatar WAOUH',
      description: 'Un guide IA vivant pour acheter, vendre, trouver, décider et conduire vos démarches.',
      prompt: 'Parler à mon Avatar',
    };
  }
  if (pathname.startsWith('/app/chat')) {
    return {
      eyebrow: 'Centre opérationnel',
      title: 'Chat Command Center',
      description: 'Discussions, Statuts et Radar dans un espace de travail unifié.',
      prompt: 'Interroger WAOUH sur mes conversations et mes opportunités',
    };
  }
  if (pathname.startsWith('/app/agents/stock') || pathname === '/app/stock') {
    return {
      eyebrow: 'Opérations',
      title: 'Stock IA',
      description: 'Niveaux, alertes de réapprovisionnement et analyses assistées par IA.',
      prompt: 'Demander à WAOUH une analyse de mon stock',
    };
  }
  if (pathname.startsWith('/app/agents/bi') || pathname === '/app/whatsapp/bi') {
    return {
      eyebrow: 'Décision',
      title: 'BI IA',
      description: 'Tableaux de bord, graphiques et lecture intelligente de vos données.',
      prompt: 'Demander à WAOUH une lecture de mes indicateurs',
    };
  }
  if (pathname.startsWith('/app/agents/attendance') || pathname === '/app/presence') {
    return {
      eyebrow: 'Terrain',
      title: 'Présence QR',
      description: 'Sites, QR géolocalisés et pointages notifiés sur WhatsApp.',
      prompt: 'Demander à WAOUH un point sur les présences',
    };
  }
  if (pathname === '/app/ia') {
    return {
      eyebrow: 'Intelligence artificielle',
      title: 'Bots & IA WAOUH',
      description: 'Vos outils IA spécialisés avec les mêmes parcours que Flutter.',
      prompt: 'Ouvrir les outils IA WAOUH',
    };
  }
  if (pathname === '/app/radar-map') {
    return {
      eyebrow: 'Détection locale',
      title: 'Radar WAOUH',
      description: 'Recherche géolocalisée intelligente et signaux de proximité.',
      prompt: 'Demander à WAOUH les opportunités proches',
    };
  }
  if (pathname.startsWith('/app/bots') || pathname.startsWith('/app/agents')) {

    return {
      eyebrow: 'Intelligence artificielle',
      title: 'Bots & Agents IA',
      description: 'Créez et pilotez les agents spécialisés de votre activité.',
      prompt: 'Ouvrir WAOUH pour configurer mon prochain agent IA',
    };
  }
  if (pathname.startsWith('/app/partner/businesses')) {
    return {
      eyebrow: 'Réseau commercial',
      title: 'Boutiques & magasins',
      description: 'Pilotez vos points de vente depuis le même système.',
      prompt: 'Demander à WAOUH une synthèse de mes boutiques',
    };
  }
  if (pathname.startsWith('/app/partner/sales')) {
    return {
      eyebrow: 'Performance',
      title: 'Ventes',
      description: 'Suivez les opérations et les opportunités commerciales.',
      prompt: 'Demander à WAOUH une analyse de mes ventes',
    };
  }
  if (pathname.startsWith('/app/whatsapp')) {
    return {
      eyebrow: 'Conversationnel',
      title: 'WhatsApp IA',
      description: 'Automatisez les échanges et le suivi des demandes.',
      prompt: 'Ouvrir le copilote conversationnel WAOUH',
    };
  }
  if (pathname.startsWith('/app/diffusion')) {
    return {
      eyebrow: 'Communication',
      title: 'Diffusion intelligente',
      description: 'Préparez et suivez vos campagnes depuis WaouhApp.',
      prompt: 'Demander à WAOUH de préparer une campagne',
    };
  }
  return {
    eyebrow: 'WaouhApp AI ERP',
    title: 'Pilotage intelligent',
    description: 'Un système unique pour gérer, analyser et décider.',
    prompt: 'Ouvrir le Chat Command Center',
  };
};

/** URL is the single source of truth for the active brick. */
const brickForLocation = (pathname: string, search: string): BrickId | null => {
  if (pathname === HOME_PATH) {
    return new URLSearchParams(search).get('tab') === 'radar' ? 'radar' : null;
  }
  // Exact match only: deeper routes (détail d'un agent, d'une boutique…) gardent leur écran dédié.
  const hit = navigation.find(
    (item) => item.brick && item.to.split('?')[0] === pathname && pathname !== HOME_PATH,
  );
  return (hit?.brick as BrickId) ?? null;

};

export const WebErpShell = ({ children, unreadChat = 0 }: WebErpShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const { profile } = useMobileProfile();
  const [collapsed, setCollapsed] = useState(false);

  const activeBrick = useMemo(
    () => brickForLocation(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const isHome = location.pathname === HOME_PATH && !activeBrick;

  const contextPath = activeBrick
    ? `${location.pathname}${location.search}`
    : location.pathname;

  const context = useMemo(() => routeContext(contextPath), [contextPath]);
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Mon espace';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'W';

  const openWaouh = () => {
    if (location.pathname !== CHAT_PATH || location.search) navigate(CHAT_PATH);
  };

  const openMuse = () => {
    if (location.pathname !== '/app/avatar') navigate('/app/avatar');
  };

  const openMissions = () => {
    if (location.pathname !== '/app/missions') navigate('/app/missions');
  };

  const selectItem = (item: NavigationItem) => {
    navigate(item.to);
  };


  return (
    <div className={cn('waouh-erp-shell', collapsed && 'waouh-erp-shell--collapsed')}>
      <aside className="waouh-erp-sidebar" aria-label="Navigation WaouhApp AI ERP">
        <div className="waouh-erp-brand">
          <div className="waouh-erp-brand__mark" aria-hidden="true">W</div>
          {!collapsed && (
            <div className="waouh-erp-brand__copy">
              <strong>WaouhApp</strong>
              <span>AI ERP</span>
            </div>
          )}
          <button
            type="button"
            className="waouh-erp-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {!collapsed && <div className="waouh-erp-nav-label">ESPACE DE TRAVAIL</div>}

        <nav className="waouh-erp-nav">
          {navigationSections.map((section) => (
            <div key={section.title} className="waouh-erp-nav__group">
              {!collapsed && <div className="waouh-erp-nav__group-title">{section.title}</div>}
              {section.items.map((item) => {
                const Icon = item.icon;
                const itemPath = item.to.split('?')[0];
                const active = item.brick
                  ? item.brick === activeBrick
                  : itemPath === HOME_PATH
                    ? isHome
                    : location.pathname === itemPath;
                const badge = !item.brick && unreadChat > 0 ? unreadChat : 0;

                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => item.brick && preloadBrick(item.brick)}
                    onFocus={() => item.brick && preloadBrick(item.brick)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'waouh-erp-nav__item',
                      active && 'is-active',
                      item.accent && `is-${item.accent}`,
                    )}
                    title={collapsed ? item.label : undefined}
                  >

                    <span className="waouh-erp-nav__icon"><Icon size={19} /></span>
                    {!collapsed && <span className="waouh-erp-nav__text">{item.label}</span>}
                    {badge > 0 && (
                      <span className="waouh-erp-nav__badge">{badge > 99 ? '99+' : badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>



        <div className="waouh-erp-sidebar__footer">
          <div className="waouh-erp-system-card">
            <div className="waouh-erp-system-card__icon"><ShieldCheck size={18} /></div>
            {!collapsed && (
              <div>
                <strong>Moteur WaouhApp</strong>
                <span>Même socle fonctionnel que l’application mobile</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="waouh-erp-main">
        <header className="waouh-erp-topbar">
          <div className="waouh-erp-page-title">
            <span>{context.eyebrow}</span>
            <div>
              <h1>{context.title}</h1>
              <p>{context.description}</p>
            </div>
          </div>

          <div className="waouh-erp-topbar__actions">
            <button
              type="button"
              className="waouh-erp-search-trigger"
              onClick={openWaouh}
            >

              <Search size={17} />
              <span>Rechercher dans WaouhApp</span>
              <kbd><Command size={12} /> K</kbd>
            </button>

            <Button
              type="button"
              variant="outline"
              className="waouh-erp-missions-action"
              onClick={openMissions}
            >
              <Workflow size={17} />
              <span>Missions & veille</span>
            </Button>

            <Button
              type="button"
              className="waouh-erp-primary-action"
              onClick={openMuse}
            >
              <BrainCircuit size={17} />
              Ouvrir Avatar
            </Button>

            <button
              type="button"
              className="waouh-erp-icon-button"
              onClick={() => navigate('/app/notifications')}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadChat > 0 && <span>{unreadChat > 99 ? '99+' : unreadChat}</span>}
            </button>

            <button
              type="button"
              className="waouh-erp-profile"
              onClick={() => navigate('/app/profile')}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span>
                <strong>{displayName}</strong>
                <small><CircleDot size={10} /> WAOUH actif</small>
              </span>
            </button>
          </div>
        </header>

        <OfflineBanner />

        <div className="waouh-erp-body">
          <main className="waouh-erp-workspace">
            {/* Le moteur de chat reste monté : basculer de brique ne le recharge jamais. */}
            <div className={cn('h-full w-full', !isHome && 'hidden')}>
              <CenterCanvas />
            </div>
            {activeBrick ? <ErpBrickCanvas brick={activeBrick} /> : null}
            {!isHome && !activeBrick ? children : null}
          </main>

        </div>
      </section>
    </div>
  );
};

export default WebErpShell;
