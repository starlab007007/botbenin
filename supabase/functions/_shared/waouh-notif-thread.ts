// deno-lint-ignore-file no-explicit-any -- client Supabase non typé.
// WAOUH — Une notification dans l'application porte TOUJOURS le thread_id canonique de son fil (colonne `thread_id`),
// pour que la cloche ouvre la bonne Deal Room même quand l'appelant n'a fourni que deal_id / article_id.
import { optionalUuid } from "./waouh-notify-actions.ts";

/** Premier thread_id valide parmi les candidats (charge utile, colonne du deal…) ; sinon null. */
export function pickNotifThreadId(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    const id = optionalUuid(c);
    if (id) return id;
  }
  return null;
}

/** thread_id d'une notification : charge utile d'abord, sinon celui du deal (une requête, seulement si nécessaire). */
export async function resolveNotifThreadId(sb: any, payload: any): Promise<string | null> {
  const direct = pickNotifThreadId(payload?.thread_id, payload?.threadId);
  if (direct) return direct;
  const dealId = optionalUuid(payload?.deal_id ?? payload?.dealId);
  if (!dealId) return null;
  try {
    const { data } = await sb.from("waouh_deals").select("thread_id").eq("id", dealId).maybeSingle();
    return pickNotifThreadId(data?.thread_id);
  } catch {
    return null;
  }
}
