// deno-lint-ignore-file no-explicit-any -- client Supabase non typé, comme le reste des edge functions.
// WAOUH — Avatar guide : collecte de l'activité de l'utilisateur, livraison du point dans son chat, tick planifié.
// L'avatar n'envoie JAMAIS rien à un tiers ici : il écrit dans le chat de l'utilisateur, avec des boutons.

import { resolveSiblingUserIds } from "./waouh-identity.ts";
import {
  activityDigest, boardFromActivity, composeBriefing, composeBubbles, emptyActivity, mergePrefs, nextBriefingAt, normalizePrefs, shouldBrief, briefingText,
  type Activity, type AvatarPrefs, type Briefing, type MissionBoard, type Trigger,
} from "./waouh-avatar-briefing.ts";
import { nudgeAllowed } from "./waouh-avatar-notes.ts";
import { externalContactState, loadExternalTimeline, NEXUS_ORIGIN } from "./waouh-nexus-deal.ts";
import { resolveContactPath } from "./waouh-contact-path.ts";
import { notifyInApp } from "./waouh-avatar-inapp.ts";

export interface PrefsRow extends AvatarPrefs { lastBriefingAt: Date | null; lastDigest: string | null; exists: boolean }

export async function loadPrefs(sb: any, authUserId: string): Promise<PrefsRow> {
  const { data } = await sb.from("waouh_avatar_prefs").select("*").eq("auth_user_id", authUserId).maybeSingle();
  const prefs = normalizePrefs(data);
  return {
    ...prefs,
    lastBriefingAt: data?.last_briefing_at ? new Date(data.last_briefing_at) : null,
    lastDigest: data?.last_digest ?? null,
    exists: !!data,
  };
}

export async function savePrefs(sb: any, authUserId: string, raw: unknown): Promise<PrefsRow> {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const current = await loadPrefs(sb, authUserId);
  // Seuls les champs valides remplacent l'existant ; le reste est ignoré (jamais d'erreur pour une valeur inconnue).
  const next: AvatarPrefs = mergePrefs(current, input);
  await sb.from("waouh_avatar_prefs").upsert({
    auth_user_id: authUserId, welcome: next.welcome, cadence: next.cadence, quiet_start: next.quietStart, quiet_end: next.quietEnd,
    notify_events: next.notifyEvents, notify_digest: next.notifyDigest, updated_at: new Date().toISOString(),
  }, { onConflict: "auth_user_id" });
  return loadPrefs(sb, authUserId);
}

const OPEN_NEG = new Set(["proposed", "countered"]);
const hoursSince = (iso: string | null | undefined, now: Date) => (iso ? Math.max(0, (now.getTime() - Date.parse(iso)) / 3600_000) : 0);

/** Activité de l'utilisateur (toutes ses identités). Borné : 60 fils, 10 fils externes. */
export async function collectActivity(sb: any, user: { id: string; auth_user_id?: string | null; phone_number?: string | null; web_session_id?: string | null; display_name?: string | null }, now: Date): Promise<Activity> {
  const activity = emptyActivity(user.display_name ?? null);
  const ids = await resolveSiblingUserIds(sb, user as any);
  if (!ids.length) return activity;
  const list = ids.join(",");
  const { data: threads } = await sb.from("waouh_chat_threads")
    .select("id,article_id,buyer_user_id,seller_user_id,negotiation_id,deal_id,status,updated_at")
    .eq("thread_type", "product_meet").not("status", "in", "(concluded,cancelled)")
    .or(`buyer_user_id.in.(${list}),seller_user_id.in.(${list})`).order("updated_at", { ascending: false }).limit(60);
  const rows: any[] = threads ?? [];
  if (rows.length) {
    const threadIds = rows.map((t) => t.id);
    const articleIds = [...new Set(rows.map((t) => t.article_id).filter(Boolean))];
    const [{ data: negs }, { data: deals }, { data: arts }] = await Promise.all([
      sb.from("waouh_negotiations").select("id,thread_id,state,last_actor,updated_at").in("thread_id", threadIds).order("updated_at", { ascending: false }),
      sb.from("waouh_deals").select("id,thread_id,status").in("thread_id", threadIds).neq("status", "cancelled"),
      sb.from("waouh_articles").select("id,title,origin").in("id", articleIds),
    ]);
    const negByThread = new Map<string, any>();
    for (const n of negs ?? []) if (!negByThread.has(n.thread_id)) negByThread.set(n.thread_id, n);
    const dealByThread = new Map<string, any>((deals ?? []).map((d: any) => [d.thread_id, d]));
    const artById = new Map<string, any>((arts ?? []).map((a: any) => [a.id, a]));
    let externalBudget = 10;

    for (const t of rows) {
      const buyer = ids.includes(t.buyer_user_id);
      const seller = ids.includes(t.seller_user_id);
      if (buyer === seller) continue;
      const art = artById.get(t.article_id);
      const title = String(art?.title ?? "Annonce");
      const neg = negByThread.get(t.id);
      const deal = dealByThread.get(t.id);
      const ref = { threadId: t.id, articleId: t.article_id ?? null, negotiationId: neg?.id ?? t.negotiation_id ?? null };
      if (neg && OPEN_NEG.has(neg.state)) activity.negotiationsOpen += 1;

      if (deal && !["completed", "cancelled"].includes(String(deal.status))) {
        activity.dealsInProgress.push({ ...ref, title, role: buyer ? "buyer" : "seller", status: String(deal.status) });
        continue;
      }
      if (seller && neg && OPEN_NEG.has(neg.state) && neg.last_actor === "buyer") {
        activity.offersToAnswer.push({ ...ref, title });
        continue;
      }
      if (buyer && art?.origin === NEXUS_ORIGIN && externalBudget > 0) {
        externalBudget -= 1;
        const timeline = await loadExternalTimeline(sb, t.id);
        if (timeline.transmittedAt) {
          activity.transmitted.push({
            ...ref, title, hours: hoursSince(timeline.transmittedAt.toISOString(), now),
            nudgeDue: !!timeline.lastSentAt && nudgeAllowed({ lastSentAt: timeline.lastSentAt, now }),
          });
        } else if (timeline.watchingSince) {
          const contact = await externalContactState(sb, t.article_id, now);
          const path = resolveContactPath({ level: contact.level, reachable: contact.reachable, signedIn: !!user.auth_user_id, relayAvailable: contact.relayAvailable });
          activity.watching.push({ ...ref, title, reachable: path.canSendNow && !contact.unavailable });
        }
        continue;
      }
      if (buyer && neg && OPEN_NEG.has(neg.state) && neg.last_actor === "buyer") {
        activity.waitingOnSeller.push({ ...ref, title, hours: hoursSince(neg.updated_at, now) });
      }
    }
  }
  // Recherches, missions et contacts (comptes bornés, une requête chacun ; une panne d'une source ne bloque pas le point).
  const headCount = async (q: () => PromiseLike<{ count: number | null }>) => { try { return (await q()).count ?? 0; } catch { return 0; } };
  const authId = user.auth_user_id ?? null;
  // Missions actives : le nombre ET les deux plus récentes (intitulé), en une requête.
  const missionsWithGoals = async () => {
    try {
      const r = await sb.from("waouh_agent_missions").select("goal", { count: "exact" }).eq("status", "active").eq("owner_id", authId)
        .order("created_at", { ascending: false }).limit(2);
      activity.missionGoals = ((r.data ?? []) as Array<{ goal?: string }>).map((m) => String(m.goal ?? "").trim()).filter(Boolean).slice(0, 2);
      return r.count ?? 0;
    } catch { return 0; }
  };
  const [profiles, watches, missions, contacted] = await Promise.all([
    headCount(() => sb.from("waouh_buyer_profiles").select("id", { count: "exact", head: true }).eq("is_active", true).in("user_id", ids)),
    authId ? headCount(() => sb.from("waouh_watchlists").select("id", { count: "exact", head: true }).eq("status", "active").eq("owner_id", authId)) : Promise.resolve(0),
    authId ? missionsWithGoals() : Promise.resolve(0),
    authId ? headCount(() => sb.from("waouh_opportunity_journeys").select("id", { count: "exact", head: true }).eq("owner_id", authId).not("last_contact_at", "is", null).is("completed_at", null)) : Promise.resolve(0),
  ]);
  activity.searches = profiles + watches;
  activity.missions = missions;
  activity.contacted = contacted;
  const since = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
  const { count } = await sb.from("waouh_deals").select("id", { count: "exact", head: true })
    .eq("status", "completed").gte("updated_at", since).or(`buyer_user_id.in.(${list}),seller_user_id.in.(${list})`);
  activity.completedRecent = count ?? 0;
  return activity;
}

export type AvatarMessageRow = { id: string; direction: "out"; text: string; meta: Record<string, unknown>; created_at: string };

export interface DeliverResult {
  sent: boolean;
  reason: string;
  briefing: Briefing | null;
  /** Dernière bulle (compatibilité des anciens clients). */
  message: AvatarMessageRow | null;
  /** Toutes les bulles du point, dans l'ordre d'affichage. */
  messages: AvatarMessageRow[];
  prefs: PrefsRow;
  nextBriefingAt: string | null;
}

/** Compose et écrit le point dans le chat de l'utilisateur si la règle l'autorise (ou s'il le demande). */
export async function deliverBriefing(sb: any, args: {
  authUserId: string;
  trigger: Trigger;
  now?: Date;
  webSessionId?: string | null;
}): Promise<DeliverResult> {
  const now = args.now ?? new Date();
  const prefs = await loadPrefs(sb, args.authUserId);
  const { data: users } = await sb.from("waouh_users").select("id,auth_user_id,phone_number,web_session_id,display_name")
    .eq("auth_user_id", args.authUserId).order("created_at", { ascending: true }).limit(1);
  const user = users?.[0];
  const idle = (reason: string): DeliverResult => ({ sent: false, reason, briefing: null, message: null, messages: [], prefs, nextBriefingAt: nextBriefingAt(prefs, prefs.lastBriefingAt, now)?.toISOString() ?? null });
  if (!user) return idle("no_waouh_user");

  const activity = await collectActivity(sb, user, now);
  const digest = activityDigest(activity);
  const preview = composeBriefing({ activity, kind: "point", now });
  const decision = shouldBrief({
    prefs, lastBriefingAt: prefs.lastBriefingAt, now, trigger: args.trigger,
    digestChanged: digest !== prefs.lastDigest, hasActionable: preview.hasActionable,
  });
  if (!decision.send || !decision.kind) return idle(decision.reason);

  const briefing = composeBriefing({ activity, kind: decision.kind, now });
  // Ouverture sans nouveauté : une phrase courte, jamais le même point répété.
  const unchanged = args.trigger === "open" && digest === prefs.lastDigest && !preview.hasActionable;
  const bubbles = composeBubbles(briefing, { unchanged });
  const briefingId = `${user.id}:${now.getTime()}`;
  const rows = bubbles.map((b, i) => ({
    user_id: user.id,
    web_session_id: args.webSessionId ?? null,
    channel: "system",
    direction: "out",
    text: b.text,
    // Les bulles s'ordonnent au millième : l'ordre d'affichage est celui de l'écriture, même en lecture temps réel.
    created_at: new Date(now.getTime() + i * 250).toISOString(),
    meta: {
      intent: "avatar_briefing", briefing_id: briefingId, avatar_bubble: { seq: i, of: bubbles.length, kind: briefing.kind },
      trigger: args.trigger, ...(b.actions.length ? { actions: b.actions } : {}),
    },
  }));
  const { data: inserted, error } = await sb.from("waouh_messages").insert(rows).select("id,direction,text,meta,created_at");
  if (error || !inserted?.length) {
    console.error("[avatar-briefing] écriture impossible", error);
    return idle("write_failed");
  }
  const messages = ([...inserted] as AvatarMessageRow[]).sort((a, b) =>
    Number((a.meta as any)?.avatar_bubble?.seq ?? 0) - Number((b.meta as any)?.avatar_bubble?.seq ?? 0));
  // Message spontané (point planifié) : notification dans l'application, Web et Flutter, même si le chat est fermé.
  if (args.trigger === "tick") {
    await notifyInApp(sb, {
      userId: user.id, text: bubbles.map((b) => b.text).join(" "), actions: briefing.actions.map((a) => ({ id: a.id, label: a.label })),
      dedupeKey: `avatar_briefing:${briefingId}`, now,
    });
  }
  // WhatsApp : bilans seulement si l'utilisateur l'a demandé (les évènements d'offre ont leur propre réglage).
  if (args.trigger === "tick" && prefs.notifyDigest && user.phone_number) {
    const last = messages[messages.length - 1];
    const { error: qErr } = await sb.rpc("waouh_enqueue_outbound_v2", {
      p_to_phone: user.phone_number, p_to_user_id: user.id, p_template: "avatar_briefing",
      p_payload: { text: bubbles.map((b) => b.text).join(" "), message_id: last.id, briefing_id: briefingId },
      p_web_session_id: user.web_session_id ?? null, p_channel: "whatsapp", p_message_id: last.id,
      p_dedupe_key: `avatar_briefing:${briefingId}`, p_event_type: "avatar_briefing",
    });
    if (qErr) console.warn("[avatar-briefing] WhatsApp non mis en file", qErr.message);
  }
  await sb.from("waouh_avatar_prefs").upsert({
    auth_user_id: args.authUserId, welcome: prefs.welcome, cadence: prefs.cadence, quiet_start: prefs.quietStart, quiet_end: prefs.quietEnd,
    notify_events: prefs.notifyEvents, notify_digest: prefs.notifyDigest, last_briefing_at: now.toISOString(), last_digest: digest, updated_at: now.toISOString(),
  }, { onConflict: "auth_user_id" });
  const nextPrefs = { ...prefs, lastBriefingAt: now, lastDigest: digest, exists: true };
  return {
    sent: true, reason: decision.reason, briefing, message: messages[messages.length - 1], messages, prefs: nextPrefs,
    nextBriefingAt: nextBriefingAt(nextPrefs, now, now)?.toISOString() ?? null,
  };
}

export interface BriefingTick { scanned: number; sent: number; skipped: number; errors: number }

/** Points réguliers : utilisateurs dont la cadence est échue. Chaque utilisateur est traité indépendamment. */
export async function runAvatarBriefingTick(sb: any, opts: { now?: Date; limit?: number } = {}): Promise<BriefingTick> {
  const now = opts.now ?? new Date();
  const out: BriefingTick = { scanned: 0, sent: 0, skipped: 0, errors: 0 };
  const { data: rows } = await sb.from("waouh_avatar_prefs").select("auth_user_id,cadence,last_briefing_at")
    .neq("cadence", "off").order("last_briefing_at", { ascending: true, nullsFirst: true }).limit(opts.limit ?? 100);
  for (const row of rows ?? []) {
    out.scanned += 1;
    try {
      const r = await deliverBriefing(sb, { authUserId: row.auth_user_id, trigger: "tick", now });
      if (r.sent) out.sent += 1; else out.skipped += 1;
    } catch (error) {
      console.error("[avatar-briefing] tick : utilisateur ignoré", row.auth_user_id, error);
      out.errors += 1;
    }
  }
  return out;
}


/** Tableau de mission de l'utilisateur (compteurs en direct). Aucune écriture, aucun point envoyé. */
export async function loadMissionBoard(sb: any, authUserId: string, now: Date = new Date()): Promise<{ board: MissionBoard; needsYou: number } | null> {
  const { data: users } = await sb.from("waouh_users").select("id,auth_user_id,phone_number,web_session_id,display_name")
    .eq("auth_user_id", authUserId).order("created_at", { ascending: true }).limit(1);
  const user = users?.[0];
  if (!user) return null;
  const board = boardFromActivity(await collectActivity(sb, user, now));
  return { board, needsYou: board.needsYou };
}
