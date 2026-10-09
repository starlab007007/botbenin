import { NavLink } from 'react-router-dom';
import { Bell, LayoutGrid, MessageCircle, Radar, Sparkles, UserCircle, Workflow, Bot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { unreadBadge } from '../utils/chatSpaceLayout';

export const TABLET_RAIL_WIDTH = 76;

const railItems = [
  { to: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/app/radar-map', icon: Radar, label: 'Radar' },
  { to: '/app/avatar', icon: UserCircle, label: 'Avatar' },
  { to: '/app/missions', icon: Workflow, label: 'Missions' },
  { to: '/app/ia', icon: Sparkles, label: 'IA' },
  { to: '/app/bots', icon: Bot, label: 'Bots' },
];

type Props = {
  unreadChat?: number;
  onOpenMenu: () => void;
};

/** Rail d'icônes des tablettes (640–1179 px) : accès direct aux modules clés + menu complet. */
export const TabletRail = ({ unreadChat = 0, onOpenMenu }: Props) => {
  const itemClass = (active: boolean) =>
    cn(
      'relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-medium transition-colors',
      active ? 'bg-[hsl(var(--wa-green))] text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
    );

  return (
    <nav
      aria-label="Navigation principale WaouhApp"
      className="no-select fixed inset-y-0 left-0 z-40 flex flex-col items-center gap-1.5 bg-[#0B3B2E] py-3"
      style={{
        width: TABLET_RAIL_WIDTH,
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
    >
      <div
        aria-hidden="true"
        className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFD27A] text-xl font-bold text-[#3A2400]"
      >
        W
      </div>
      {railItems.map(({ to, icon: Icon, label }) => {
        const badge = to === '/app/chat' ? unreadBadge(unreadChat) : null;
        return (
          <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => itemClass(isActive)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
            {badge && (
              <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                {badge}
              </span>
            )}
          </NavLink>
        );
      })}
      <div className="flex-1" />
      <NavLink to="/app/notifications" aria-label="Notifications" className={({ isActive }) => itemClass(isActive)}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        <span>Alertes</span>
      </NavLink>
      <button type="button" onClick={onOpenMenu} aria-label="Ouvrir tous les modules" className={itemClass(false)}>
        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
        <span>Modules</span>
      </button>
    </nav>
  );
};

export default TabletRail;
