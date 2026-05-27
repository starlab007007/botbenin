import { NavLink } from 'react-router-dom';
import { MessageCircle, Bot, Smartphone, Megaphone, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/app/bots', icon: Bot, label: 'Bots' },
  { to: '/app/whatsapp', icon: Smartphone, label: 'WhatsApp IA' },
  { to: '/app/diffusion', icon: Megaphone, label: 'Diffusion' },
  { to: '/app/partner', icon: Store, label: 'Partenaire' },
];

interface Props {
  unreadChat?: number;
}

export const BottomTabBar = ({ unreadChat = 0 }: Props) => {
  return (
    <nav
      className="no-select fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, icon: Icon, label }) => {
          const badge = to === '/app/chat' ? unreadChat : 0;
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                    isActive
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
                </div>
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
