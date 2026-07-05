import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { getQuotaState, subscribeQuota, clearQuotaBlock, type QuotaState } from '@/lib/quota-status';

/**
 * Bandeau global affiché quand Supabase renvoie 402 exceed_egress_quota.
 * Mode dégradé: on informe l'utilisateur au lieu de laisser passer une
 * erreur cryptique "Erreur de connexion".
 */
export function QuotaBanner() {
  const [state, setState] = useState<QuotaState>(getQuotaState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribeQuota(setState), []);

  if (!state.blocked || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[9999] bg-destructive text-destructive-foreground shadow-lg"
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <div className="font-semibold mb-1">
            Service temporairement limité (quota dépassé)
          </div>
          <div className="opacity-90 leading-snug">
            Le backend Supabase a dépassé son quota mensuel (egress). Les données
            en cache restent visibles mais les nouvelles requêtes échoueront.
            <br />
            <strong>Actions&nbsp;:</strong> ouvrez le tableau de bord Supabase →
            Billing, retirez le plafond de dépenses ou passez au plan Pro pour
            rétablir le service immédiatement.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="https://supabase.com/dashboard/project/mvynepqulhflxtyymtzs/settings/billing"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md bg-background text-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90"
            >
              Ouvrir Supabase Billing
            </a>
            <button
              onClick={() => {
                clearQuotaBlock();
                window.location.reload();
              }}
              className="inline-flex items-center rounded-md border border-background/40 px-3 py-1.5 text-xs font-medium hover:bg-background/10"
            >
              Réessayer
            </button>
          </div>
        </div>
        <button
          aria-label="Fermer"
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-background/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default QuotaBanner;
