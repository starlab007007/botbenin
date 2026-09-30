// deno-lint-ignore-file no-explicit-any -- client Supabase non typé.
// WAOUH — Notification dans l'application (cloche Web + bannière Flutter) pour les messages SPONTANÉS de l'avatar.
// Même source pour les deux clients : `waouh_notifications` (temps réel par utilisateur). Les clients ouverts la reçoivent
// en même temps ; ouvrir le chat ne la répète pas (la bulle est déjà dans la conversation, la notification se marque lue).

export const AVATAR_NOTIF_TYPE = "avatar_point";

export interface AvatarInAppNotification {
  userId: string;
  text: string;
  title?: string;
  actions?: Array<{ id: string; label: string }>;
  threadId?: string | null;
  articleId?: string | null;
  dedupeKey: string;
  now?: Date;
}

/** Écrit la notification ; une clé déjà vue ou une erreur n'a jamais d'effet sur le message de chat (déjà écrit). */
export async function notifyInApp(sb: any, n: AvatarInAppNotification): Promise<boolean> {
  const at = (n.now ?? new Date()).toISOString();
  try {
    const { error } = await sb.from("waouh_notifications").insert({
      user_id: n.userId,
      notification_type: AVATAR_NOTIF_TYPE,
      channel: "waouh_app",
      delivery_status: "delivered",
      delivered_at: at,
      sent_at: at,
      thread_id: n.threadId ?? null,
      article_id: n.articleId ?? null,
      dedupe_key: n.dedupeKey,
      payload: { intent: "avatar_briefing", title: n.title ?? "Votre avatar", text: n.text.slice(0, 400), actions: (n.actions ?? []).slice(0, 3) },
    });
    if (error && !/duplicate|23505/i.test(`${error.code ?? ""}${error.message ?? ""}`)) {
      console.warn("[avatar-inapp] notification non écrite", error.message);
      return false;
    }
    return !error;
  } catch (error) {
    console.warn("[avatar-inapp] notification non écrite", error);
    return false;
  }
}
