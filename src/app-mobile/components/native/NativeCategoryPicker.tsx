import { useMemo, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  onCreate?: (custom: string) => void;
  invalid?: boolean;
  errorMessage?: string;
}

/**
 * Picker plein écran (bottom-sheet) façon Android natif :
 * - barre de recherche sticky
 * - liste scroll fluide
 * - création de valeur libre quand allowCustom & aucun match
 */
export default function NativeCategoryPicker({
  label,
  value,
  onChange,
  options,
  placeholder = 'Sélectionner...',
  allowCustom = false,
  onCreate,
  invalid,
  errorMessage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(o => o.toLowerCase().includes(s));
  }, [q, options]);

  const exactMatch = filtered.some(o => o.toLowerCase() === q.trim().toLowerCase());
  const canCreate = allowCustom && q.trim().length > 0 && !exactMatch;

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  const create = () => {
    const v = q.trim();
    if (!v) return;
    onCreate?.(v);
    select(v);
  };

  return (
    <>
      {label && <label className="text-sm font-medium block mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-2 h-12 px-3 rounded-lg border bg-background text-left',
          'active:bg-accent transition-colors',
          invalid ? 'border-destructive' : 'border-input',
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-5 w-5 opacity-60 shrink-0" />
      </button>
      {invalid && errorMessage && (
        <p className="text-xs text-destructive mt-1">{errorMessage}</p>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="p-0 h-[92dvh] rounded-t-2xl flex flex-col"
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-semibold">{label || 'Choisir'}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 -mr-2 rounded-full active:bg-accent"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Rechercher ou créer..."
                inputMode="search"
                autoComplete="off"
                className="h-11 pl-9"
              />
            </div>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={create}
              className="mx-4 mb-2 flex items-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-primary/50 text-primary bg-primary/5 active:bg-primary/10"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="text-sm text-left">
                Créer la catégorie <strong>« {q.trim()} »</strong>
              </span>
            </button>
          )}

          <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-[env(safe-area-inset-bottom)]">
            {filtered.length === 0 && !canCreate && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucun résultat
              </p>
            )}
            <ul className="py-1">
              {filtered.map(o => {
                const selected = o === value;
                return (
                  <li key={o}>
                    <button
                      type="button"
                      onClick={() => select(o)}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left rounded-lg',
                        'active:bg-accent transition-colors',
                        selected && 'bg-accent/60',
                      )}
                    >
                      <span className="text-[15px]">{o}</span>
                      {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
