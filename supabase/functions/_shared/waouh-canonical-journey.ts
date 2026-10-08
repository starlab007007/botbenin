// deno-lint-ignore-file no-explicit-any -- server-side Supabase client.
/** Bind direct product interests to the same thread followed by agreement/deal triggers. */
export async function trackCanonicalParticipantJourney(sb: any, input: {
  ownerId: string | null; articleId: string; threadId: string; negotiationId: string | null;
  source: string; title: string; city?: string | null; sourceKey: string; mode?: "buy" | "sell";
}) {
  const mode = input.mode || "buy";
  if (!input.ownerId || (mode === "buy" && ["avatar_legacy_approval", "avatar_positive_reply"].includes(input.source))) return;
  const table = () => sb.from("waouh_opportunity_journeys");
  const existing = await table().select("id").eq("owner_id", input.ownerId).eq("thread_id", input.threadId)
    .not("stage", "in", '("completed","cancelled")').limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return;
  const unbound = await table().select("id").eq("owner_id", input.ownerId).eq("fabric_id", `article:${input.articleId}`)
    .eq("mode", mode).is("mandate_id", null).is("thread_id", null)
    .not("stage", "in", '("completed","cancelled")').order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (unbound.error) throw unbound.error;
  const state = {
    thread_id: input.threadId, negotiation_id: input.negotiationId,
    stage: "contacting", contactability_level: "C2", progress: 42, contact_channel: "waouh",
    last_action: "canonical_thread_opened", last_message: mode === "sell" ? "Un acheteur a ouvert une discussion sur votre offre." : "Discussion ouverte. La réponse de la contrepartie reste attendue.",
    next_action: mode === "sell" ? "Examiner le besoin ou la proposition de l’acheteur et lui répondre." : "Suivre la réponse et préciser le prix et les conditions dans cette discussion.",
    updated_at: new Date().toISOString(),
  };
  const result = unbound.data ? await table().update(state).eq("id", unbound.data.id) : await table().insert({
    ...state, owner_id: input.ownerId, fabric_id: `article:${input.articleId}`, article_id: input.articleId,
    mode, source_key: input.sourceKey, subject: input.title, city: input.city || null,
    metadata: { origin_surface: input.source },
    timeline: [{ at: state.updated_at, action: state.last_action, stage: state.stage, message: state.last_message }],
  });
  if (result.error) throw result.error;
}
