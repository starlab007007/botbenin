// WAOUH — Traçabilité bout en bout (correlation_id).
//
// Un `correlation_id` déterministe relie, pour un couple (article × interlocuteur),
// TOUTES les étapes du parcours : notification reçue → clic → ouverture de la
// fenêtre dédiée → messages envoyés/reçus → réponses moteur/WhatsApp.
//
// Format : corr_<article8>_<role>_<counterpart8|any>
// Il est donc reconstructible côté serveur comme côté client, sans stockage.

import { supabase } from "@/integrations/supabase/client";

export type WaouhRole = "buyer" | "seller";

function short(id: string | null | undefined, fallback = "any"): string {
  const v = String(id ?? "").replace(/[^a-zA-Z0-9-]/g, "");
  return v ? v.slice(0, 8) : fallback;
}

/** Identifiant de corrélation déterministe pour (article × rôle × interlocuteur). */
export function correlationIdFor(
  articleId: string | null | undefined,
  role: WaouhRole,
  counterpartId?: string | null
): string {
  return `corr_${short(articleId, "noart")}_${role}_${short(counterpartId)}`;
}

export type UiTraceStage =
  | "ui_notification_click"
  | "ui_window_open"
  | "ui_message_sent"
  | "ui_message_received";

export interface UiTraceArgs {
  correlation_id: string;
  stage: UiTraceStage;
  article_id?: string | null;
  role?: WaouhRole | null;
  counterpart_user_id?: string | null;
  notification_id?: string | null;
  message_id?: string | null;
  negotiation_id?: string | null;
  transaction_id?: string | null;
  intent?: string | null;
  session_id?: string | null;
  payload?: Record<string, any>;
}

/** Envoi fire-and-forget : jamais bloquant, jamais d'erreur remontée à l'UI. */
export function traceUi(args: UiTraceArgs): void {
  try {
    supabase.functions
      .invoke("waouh-trace-ui", { body: args })
      .catch(() => {});
  } catch {
    /* noop */
  }
}
