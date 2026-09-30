// deno-lint-ignore-file no-explicit-any -- client Supabase non typé.
// WAOUH — Garde anti-doublon des messages : deux requêtes rapprochées (double tap, Web + app, relance réseau) ne doivent pas
// écrire deux fois la même bulle chez la même personne. Constaté en production : 29 « buyer_interest » et 17 « new_buyer »
// en double (écart de 0,4 à 1,3 s), sans clé de dédoublonnage, plus l'écho « Intéressé » répété à la réouverture d'une annonce.

export interface RecentDuplicateQuery {
  threadId: string | null | undefined;
  userId: string | null | undefined;
  direction?: "in" | "out";
  /** Texte identique (égalité stricte) ; omis : l'intention seule décide. */
  text?: string | null;
  intent?: string | null;
  withinSeconds?: number;
  now?: Date;
}

/** Vrai si un message équivalent a déjà été écrit pour ce fil et cette personne dans la fenêtre. Jamais d'exception : en cas de doute, on écrit. */
export async function recentDuplicateExists(sb: any, q: RecentDuplicateQuery): Promise<boolean> {
  if (!q.threadId || !q.userId || (!q.text && !q.intent)) return false;
  const since = new Date((q.now ?? new Date()).getTime() - (q.withinSeconds ?? 15) * 1000).toISOString();
  try {
    let query = sb.from("waouh_messages").select("id").eq("thread_id", q.threadId).eq("user_id", q.userId).gte("created_at", since);
    if (q.direction) query = query.eq("direction", q.direction);
    if (q.text) query = query.eq("text", q.text);
    if (q.intent) query = query.eq("meta->>intent", q.intent);
    const { data } = await query.limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/** Notification dans l'application (waouh_notifications) du même type déjà écrite pour ce fil et cette personne. */
export async function recentNotificationExists(
  sb: any,
  q: { threadId?: string | null; userId?: string | null; type: string; withinSeconds?: number; now?: Date },
): Promise<boolean> {
  if (!q.threadId || !q.userId) return false;
  const since = new Date((q.now ?? new Date()).getTime() - (q.withinSeconds ?? 60) * 1000).toISOString();
  try {
    const { data } = await sb.from("waouh_notifications").select("id")
      .eq("thread_id", q.threadId).eq("user_id", q.userId).eq("notification_type", q.type).gte("sent_at", since).limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
