import { ReactNode } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  saving?: boolean;
  submitLabel?: string;
  onSubmit: () => void;
  canSubmit?: boolean;
  children: ReactNode;
}

/**
 * Conteneur plein écran style "Activity" Android :
 * header sticky vert · contenu scrollable · bouton sticky bas
 * (sans Dialog/Popover web).
 */
export default function NativeFormScreen({
  title,
  subtitle,
  onBack,
  saving,
  submitLabel = 'Enregistrer',
  onSubmit,
  canSubmit = true,
  children,
}: Props) {
  const navigate = useNavigate();
  const back = onBack || (() => navigate(-1));
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header
        className="sticky top-0 z-10 bg-[hsl(var(--wa-green))] text-white shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <button
            onClick={back}
            className="p-2 -ml-2 rounded-full active:bg-white/10"
            aria-label="Retour"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-white/75 truncate">{subtitle}</p>}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-32 space-y-5 [-webkit-overflow-scrolling:touch]">
        {children}
      </main>

      <footer
        className="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Button
          type="button"
          onClick={onSubmit}
          disabled={saving || !canSubmit}
          className={cn('w-full h-12 text-base font-semibold')}
        >
          {saving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
          {submitLabel}
        </Button>
      </footer>
    </div>
  );
}
