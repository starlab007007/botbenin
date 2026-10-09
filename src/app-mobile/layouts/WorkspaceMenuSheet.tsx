import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Search } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { filterNavigationSections, type NavigationItem } from '@/erp/navigation';
import { requiresWaouhAuthentication } from '@/lib/waouhAccessPolicy';
import { useMobileAuth } from '../hooks/useMobileAuth';
import { unreadBadge } from '../utils/chatSpaceLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** phone : feuille du bas ; tablette : tiroir latéral. */
  side?: 'bottom' | 'left';
  unreadChat?: number;
};

/**
 * Menu complet de l'espace de travail : les mêmes modules, dans les mêmes
 * sections, que la barre latérale PC (source unique : src/erp/navigation.ts).
 */
export const WorkspaceMenuSheet = ({ open, onOpenChange, side = 'bottom', unreadChat = 0 }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useMobileAuth();
  const [query, setQuery] = useState('');
  const sections = useMemo(() => filterNavigationSections(query), [query]);

  const go = (item: NavigationItem) => {
    onOpenChange(false);
    setQuery('');
    if (item.external) {
      window.open(item.to, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(item.to);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          'flex flex-col gap-3 p-0',
          side === 'bottom' ? 'max-h-[88dvh] rounded-t-2xl' : 'w-[340px] max-w-[85vw]',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <SheetHeader className="px-4 pt-4 text-left">
          <SheetTitle className="font-semibold">Espace de travail</SheetTitle>
          <SheetDescription className="sr-only">Tous les modules WAOUH</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <label className="relative block">
            <span className="sr-only">Rechercher un module</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un module"
              className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--wa-green))]"
            />
          </label>
        </div>

        <nav aria-label="Modules WAOUH" className="flex-1 overflow-y-auto px-4 pb-4">
          {sections.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun module ne correspond.</p>
          )}
          {sections.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <ul className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const target = item.to.split('?')[0];
                  const active = !item.external && (pathname === target || (target !== '/' && pathname.startsWith(`${target}/`)));
                  const locked = !user && !item.external && requiresWaouhAuthentication(item.to);
                  const badge = item.to === '/app/chat' ? unreadBadge(unreadChat) : null;
                  return (
                    <li key={item.to + item.label}>
                      <button
                        type="button"
                        onClick={() => go(item)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
                          active
                            ? 'bg-[hsl(var(--wa-green)/0.12)] text-[hsl(var(--wa-green))]'
                            : 'bg-muted/50 text-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badge && (
                          <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white">{badge}</span>
                        )}
                        {locked && <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" aria-label="Connexion requise" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default WorkspaceMenuSheet;
