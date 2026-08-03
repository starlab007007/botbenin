import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  BarChart3,
  Bell,
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
  Lightbulb,
  Megaphone,
  MessageSquareText,
  Package,
  QrCode,
  Search,

  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
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

const HOME_PATH = '/app/chat';

const navigationSections: NavigationSection[] = [
  {
    title: 'Communication',
    items: [
      { label: 'Chat Command Center', to: HOME_PATH, icon: MessageSquareText, accent: 'chat' },
      { label: 'Radar', to: '/app/chat?tab=radar', icon: RadarIcon, brick: 'radar' },
      { label: 'WhatsApp IA', to: '/app/whatsapp', icon: UsersRound, brick: 'whatsapp' },
      { label: 'Diffusion', to: '/app/diffusion', icon: Megaphone, brick: 'diffusion' },
    ],
  },
  {
    title: 'Agents IA',
    items: [
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
  if (pathname.startsWith('/app/apres-bac')) {
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
  if (pathname.startsWith('/app/chat')) {

    return {
      eyebrow: 'Centre opérationnel',
      title: 'Chat Command Center',
      description: 'Discussions, Statuts et Radar dans un espace de travail unifié.',
      prompt: 'Interroger WAOUH sur mes conversations et mes opportunités',
    };
  }
  if (pathname.startsWith('/app/agents/stock')) {
    return {
      eyebrow: 'Opérations',
      title: 'Stock IA',
      description: 'Niveaux, alertes de réapprovisionnement et analyses assistées par IA.',
      prompt: 'Demander à WAOUH une analyse de mon stock',
    };
  }
  if (pathname.startsWith('/app/agents/bi')) {
    return {
      eyebrow: 'Décision',
      title: 'BI IA',
      description: 'Tableaux de bord, graphiques et lecture intelligente de vos données.',
      prompt: 'Demander à WAOUH une lecture de mes indicateurs',
    };
  }
  if (pathname.startsWith('/app/agents/attendance')) {
    return {
      eyebrow: 'Terrain',
      title: 'Présence QR',
      description: 'Sites, QR géolocalisés et pointages notifiés sur WhatsApp.',
      prompt: 'Demander à WAOUH un point sur les présences',
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

const contextualActions = (pathname: string) => {
  if (pathname.startsWith('/app/chat')) {
    return [
      'Analyser les discussions prioritaires',
      'Rechercher une opportunité à proximité',
      'Préparer une vente ou une négociation',
    ];
  }
  if (pathname.includes('/stock')) {
    return [
      'Identifier les produits critiques',
      'Préparer un réapprovisionnement',
      'Analyser la rotation du stock',
    ];
  }
  if (pathname.includes('/bi/')) {
    return [
      'Expliquer les principaux indicateurs',
      'Comparer deux périodes',
      'Préparer un rapport de performance',
    ];
  }
  if (pathname.startsWith('/app/partner')) {
    return [
      'Comparer les boutiques',
      'Analyser les ventes récentes',
      'Identifier les actions prioritaires',
    ];
  }
  return [
    'Résumer la situation actuelle',
    'Identifier les priorités',
    'Préparer une action avec WAOUH',
  ];
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
  const actions = useMemo(() => contextualActions(contextPath), [contextPath]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Mon espace';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'W';

  const openWaouh = () => {
    if (location.pathname !== HOME_PATH || location.search) navigate(HOME_PATH);
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
                  : isHome && itemPath === HOME_PATH;
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
              className="waouh-erp-primary-action"
              onClick={openWaouh}
            >
              <Sparkles size={17} />
              Discuter avec WAOUH
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



          <aside className="waouh-erp-copilot" aria-label="Copilote contextuel WaouhApp">
            <div className="waouh-erp-copilot__hero">
              <div className="waouh-erp-copilot__icon"><Sparkles size={20} /></div>
              <span>Copilote contextuel</span>
              <h2>WAOUH comprend votre espace de travail</h2>
              <p>
                Utilisez le moteur conversationnel existant pour analyser, rechercher,
                vendre, acheter ou négocier.
              </p>
              <Button type="button" onClick={openWaouh} className="w-full">
                <MessageSquareText size={17} />
                {context.prompt}
              </Button>
            </div>

            <section className="waouh-erp-copilot__section">
              <div className="waouh-erp-copilot__section-title">
                <Lightbulb size={16} />
                Suggestions dans ce contexte
              </div>
              <div className="waouh-erp-copilot__suggestions">
                {actions.map((action) => (
                  <button key={action} type="button" onClick={openWaouh}>
                    <span>{action}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>

            <section className="waouh-erp-copilot__section waouh-erp-copilot__status">
              <div>
                <strong>Architecture AI-native</strong>
                <span>Chat, Bots, BI, Stock et Boutiques réunis dans le même shell Web.</span>
              </div>
              <UserRound size={20} />
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default WebErpShell;
