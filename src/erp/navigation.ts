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
      { label: 'Chat Command Center', to: CHAT_PATH, icon: MessageSquareText, accent: 'chat' },
      { label: 'Radar', to: '/app/radar-map', icon: RadarIcon, brick: 'radar' },
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
      { label: 'Agents IA', to: '/app/whatsapp/select-agent', icon: Sparkles, brick: 'agents', accent: 'ai' },
      { label: 'Conversationnel', to: '/app/whatsapp/conversationnel', icon: MessagesSquare, brick: 'conversational' },
      { label: 'BI WAOUH IA', to: '/app/whatsapp/bi', icon: BarChart3, brick: 'bi', accent: 'bi' },
      { label: 'Stock WAOUH IA', to: '/app/stock', icon: Package, brick: 'stock', accent: 'stock' },
      { label: 'Présence QR', to: '/app/presence', icon: QrCode, brick: 'presence' },
      { label: 'PrivatAI (IA locale)', to: '/privatia', icon: ShieldCheck, external: true },
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
      { label: 'AprèsBac IA', to: '/app/apresbac', icon: GraduationCap, brick: 'apresbac' },
      { label: 'FA IA', to: '/app/fa-ia', icon: BookOpenText, brick: 'fa' },
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
