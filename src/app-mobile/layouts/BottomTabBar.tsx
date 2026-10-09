import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Workflow, Sparkles, UserCircle, Menu as MenuIcon, LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileAuth } from '../hooks/useMobileAuth';
import { requiresWaouhAuthentication } from '@/lib/waouhAccessPolicy';

// Bots, Partenaires, Boutiques, Ventes, Diffusion… : accessibles via « Menu » (liste complète, identique au PC).
const tabs = [
  { to: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/app/missions', icon: Workflow, label: 'Missions' },
  { to: '/app/ia', icon: Sparkles, label: 'IA' },
  { to: '/app/avatar', icon: UserCircle, label: 'Avatar' },
];

interface Props {
  unreadChat?: number;
  onOpenMenu?: () => void;
}

export const BottomTabBar = ({ unreadChat = 0, onOpenMenu }: Props) => {
  const { pathname } = useLocation();
  const { user } = useMobileAuth();

  return (
    <nav
      className="no-select fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation principale WaouhApp"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, icon: Icon, label }) => {
          const badge = to === '/app/chat' ? unreadChat : 0;
          const avatarHome = to === '/app/avatar' && pathname === '/';
          const locked = !user && requiresWaouhAuthentication(to);
          return (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={locked ? `${label} — connexion requise` : label}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                    isActive || avatarHome
                      ? 'text-[hsl(var(--wa-green))] font-medium'
                      : 'text-muted-foreground'
                  )
                }
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {locked && (
                    <span className="absolute -top-1.5 -right-2 h-[16px] w-[16px] rounded-full bg-background border border-border flex items-center justify-center">
                      <LockKeyhole className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Ouvrir tous les modules"
            className="relative flex min-h-14 w-full flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors"
          >
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};
