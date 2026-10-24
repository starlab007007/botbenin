import { supabase } from '@/integrations/supabase/client';
export { resultEssentials, resultKind, withSearchReferences, marketReferences, planTotal, CONVERGENCE_LIMIT } from '../../../supabase/functions/_shared/waouh-convergence-contract';
export type { ConvergenceKind, ConvergenceRow, MarketReference } from '../../../supabase/functions/_shared/waouh-convergence-contract';
export async function convergence<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('waouh-convergence', { body: { action, payload } });
  if (error) {
    let message = 'Impossible de poursuivre. Votre saisie est conservée ; vérifiez la connexion et réessayez.';
    try { const detail = await error.context?.json(); if (typeof detail?.error === 'string') message = detail.error; } catch { /* keep safe fallback */ }
    throw new Error(message);
  }
  if (!data?.ok) throw new Error(data?.error || 'Cette action n’a pas pu aboutir.');
  return data.data as T;
}
