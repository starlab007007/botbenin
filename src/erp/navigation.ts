import {
  BarChart3,
  BookOpenText,
  Bot,
  GraduationCap,
  Handshake,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  Package,
  QrCode,
  Radar as RadarIcon,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UsersRound,
  Workflow,
} from 'lucide-react';

import type { BrickId } from './ErpBrickCanvas';

/**
 * SOURCE UNIQUE des modules WAOUH.
 * Alimente la barre latérale PC, le rail tablette, le menu complet mobile et
 * le test de parité : un module ajouté ici apparaît à tous les paliers.
 */
export type NavigationItem = {
  label: string;
  to: string;
  icon: typeof MessageSquareText;
  /** When set, the item swaps the central canvas instead of navigating. */
  brick?: BrickId;
  accent?: 'chat' | 'ai' | 'stock' | 'bi' | 'store';
  /** Page publique hors de l'espace de travail : s'ouvre dans un nouvel onglet. */
  external?: boolean;
  /**
   * Clé stable alignée sur public.waouh_frontend_modules (parité Flutter
   * live_menu_sheet.dart) : permet à l'administrateur d'activer/désactiver
   * ce module par rôle depuis /admin/modules. Voir useFrontendModules.
   */
  key: string;
};

export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

export const HOME_PATH = '/';
export const CHAT_PATH = '/app/chat';

export const navigationSections: NavigationSection[] = [
  {
    title: 'Communication',
    items: [
      { key: 'chat', label: 'Chat Command Center', to: CHAT_PATH, icon: MessageSquareText, accent: 'chat' },
      { key: 'radar', label: 'Radar', to: '/app/radar-map', icon: RadarIcon, brick: 'radar' },
      { key: 'whatsapp', label: 'WhatsApp IA', to: '/app/whatsapp', icon: UsersRound, brick: 'whatsapp' },
      { key: 'diffusion', label: 'Diffusion', to: '/app/diffusion', icon: Megaphone, brick: 'diffusion' },
    ],
  },
  {
    title: 'Agents IA',
    items: [
      { key:'nexus',label:'Recherche guidée',to:'/app/nexus',icon:Sparkles },
      { key:'ia',label:'IA',to:'/app/ia',icon:Sparkles },
      { key: 'avatar', label: 'Avatar', to: '/app/avatar', icon: Sparkles, accent: 'ai' },
      { key: 'missions', label: 'Missions & veille', to: '/app/missions', icon: Workflow, accent: 'ai' },
      { key: 'bots', label: 'Bots', to: '/app/bots', icon: Bot, brick: 'bots', accent: 'ai' },
      { key: 'agents_ia', label: 'Agents IA', to: '/app/whatsapp/select-agent', icon: Sparkles, brick: 'agents', accent: 'ai' },
      { key: 'conversationnel', label: 'Conversationnel', to: '/app/whatsapp/conversationnel', icon: MessagesSquare, brick: 'conversational' },
      { key: 'bi', label: 'BI WAOUH IA', to: '/app/whatsapp/bi', icon: BarChart3, brick: 'bi', accent: 'bi' },
      { key: 'stock', label: 'Stock WAOUH IA', to: '/app/stock', icon: Package, brick: 'stock', accent: 'stock' },
      { key: 'presence', label: 'Présence QR', to: '/app/presence', icon: QrCode, brick: 'presence' },
      { key: 'privatia', label: 'PrivatAI (IA locale)', to: '/privatia', icon: ShieldCheck, external: true },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { key: 'boutiques', label: 'Boutiques & magasins', to: '/app/partner/businesses', icon: Store, brick: 'store', accent: 'store' },
      { key: 'ventes', label: 'Ventes', to: '/app/partner/sales', icon: ShoppingCart, brick: 'sales' },
      { key:'versements',label:'Versements',to:'/app/partner/payouts',icon:ShoppingCart },
      { key:'paiements',label:'Paiements',to:'/app/partner/payments',icon:ShoppingCart },
      { key: 'partenaires', label: 'Partenaires', to: '/app/partner', icon: Handshake, brick: 'partner' },
    ],
  },
  {
    title: 'Services IA',
    items: [
      { key: 'apresbac', label: 'AprèsBac IA', to: '/app/apresbac', icon: GraduationCap, brick: 'apresbac' },
      { key: 'fa_ia', label: 'FA IA', to: '/app/fa-ia', icon: BookOpenText, brick: 'fa' },
    ],
  },
];

export const navigation: NavigationItem[] = navigationSections.flatMap((section) => section.items);

const fold = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Filtre les sections par libellé de module ou de section (sans accents ni casse). */
export const filterNavigationSections = (query: string): NavigationSection[] => {
  const q = fold(query.trim());
  if (!q) return navigationSections;
  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => fold(item.label).includes(q) || fold(section.title).includes(q),
      ),
    }))
    .filter((section) => section.items.length > 0);
};

/**
 * Filtre les sections selon les modules que l'administrateur a rendus
 * visibles pour le rôle de l'utilisateur courant (table
 * public.waouh_frontend_modules, via useFrontendModules).
 * `visibleKeys === null` = chargement en cours : tout reste affiché pour
 * éviter un scintillement (fail-open), le temps que la règle arrive.
 */
export const filterNavigationSectionsByVisibility = (
  sections: NavigationSection[],
  visibleKeys: ReadonlySet<string> | null,
): NavigationSection[] => {
  if (!visibleKeys) return [];
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => visibleKeys.has(item.key)),
    }))
    .filter((section) => section.items.length > 0);
};
