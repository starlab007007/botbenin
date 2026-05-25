import { NavLink } from 'react-router-dom';
import { MessageCircle, Bot, Smartphone, Megaphone, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/app/bots', icon: Bot, label: 'Bots' },
  { to: '/app/whatsapp', icon: Smartphone, label: 'WhatsApp' },
  { to: '/app/diffusion', icon: Megaphone, label: 'Diffusion' },
  { to: '/app/partner', icon: Store, label: 'Partenaire' },
];

export const BottomTabBar = () => {
  return (
    <nav
      className="no-select fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-[hsl(var(--wa-green))] font-medium'
                    : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
