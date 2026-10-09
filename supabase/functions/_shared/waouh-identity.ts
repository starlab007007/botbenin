// WAOUH — Identity sibling resolver.
// Une même personne peut avoir plusieurs lignes `waouh_users` :
//  - compte App (auth_user_id) + compte WhatsApp (phone_number)
//  - LID privacy (`<lid>@lid`) + phone canonique E.164
//  - doublons historiques (web sessions multiples)
//
// `resolveSiblingUserIds` retourne l'ensemble des waouh_users.id qui
// appartiennent à la même personne. Utilisé par waouh-channel-in et
// waouh-negotiation-router pour retrouver la bonne négociation même
// quand la contre-offre arrive depuis une identité différente de
// celle stockée sur `waouh_negotiations`.

export interface WaouhUserLike {
  id: string;
  auth_user_id?: string | null;
  phone_number?: string | null;
  web_session_id?: string | null;
}

function isLid(value: string | null | undefined): boolean {
  return !!value && /@lid$/i.test(value);
}

function lidPart(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isLid(value)) return value.replace(/@lid$/i, "");
  return null;
}

function addPhoneVariants(out: Set<string>, value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw || isLid(raw)) return;
  out.add(raw);

  const digits = raw.replace(/^\+/, "").replace(/\D/g, "");
  if (!digits) return;
  out.add(digits);
  out.add(`+${digits}`);

  if (digits.startsWith("229")) {
    const local = digits.slice(3);
    if (local.length === 10 && local.startsWith("01")) {
      const legacy = `229${local.slice(2)}`;
      out.add(legacy);
      out.add(`+${legacy}`);
    } else if (local.length === 8) {
      const modern = `22901${local}`;
      out.add(modern);
      out.add(`+${modern}`);
    }
  } else if (digits.length === 8) {
    out.add(`229${digits}`);
    out.add(`+229${digits}`);
    out.add(`22901${digits}`);
    out.add(`+22901${digits}`);
  } else if (digits.length === 10 && digits.startsWith("01")) {
    out.add(`229${digits}`);
    out.add(`+229${digits}`);
    out.add(`229${digits.slice(2)}`);
    out.add(`+229${digits.slice(2)}`);
  }
}

/** Lecture des identités d'un compte : pages de 1000, 3 pages au plus (3000 lignes). */
export const SIBLING_PAGE = 1000;
export const SIBLING_MAX_PAGES = 3;

export async function resolveSiblingUserIds(
  sb: any,
  user: WaouhUserLike | null | undefined,
): Promise<string[]> {
  const ids = new Set<string>();
  if (!user?.id) return [];
  ids.add(user.id);

  try {
    // 1) Même auth_user_id (App)
    if (user.auth_user_id) {
      // Un compte peut avoir des centaines de lignes (une par session Web) : lecture PAGINÉE. Avec une limite de 50, la ligne
      // du vendeur d'un fil pouvait tomber hors de la liste et le vendeur était refusé (« not_a_participant », constaté en production).
      for (let page = 0; page < SIBLING_MAX_PAGES; page++) {
        const { data } = await sb
          .from("waouh_users")
          .select("id")
          .eq("auth_user_id", user.auth_user_id)
          .order("id", { ascending: true })
          .range(page * SIBLING_PAGE, (page + 1) * SIBLING_PAGE - 1);
        for (const r of data || []) ids.add(r.id);
        if ((data?.length ?? 0) < SIBLING_PAGE) break;
      }
    }

    // 2) Même phone_number exact
    if (user.phone_number) {
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .eq("phone_number", user.phone_number)
        .limit(20);
      for (const r of data || []) ids.add(r.id);
    }

    // 3) LID → phone canonique (puis tous les waouh_users sur ce phone)
    //    et phone → LID (inverse).
    const phonesToExpand = new Set<string>();
    const lidsToExpand = new Set<string>();

    if (isLid(user.phone_number)) {
      const lid = lidPart(user.phone_number);
      if (lid) lidsToExpand.add(lid);
    } else if (user.phone_number) {
      addPhoneVariants(phonesToExpand, user.phone_number);
    }

    if (lidsToExpand.size > 0) {
      const { data } = await sb
        .from("waouh_lid_phone_map")
        .select("lid, jid, phone, phone_e164, pushname")
        .in("lid", [...lidsToExpand])
        .limit(20);
      for (const r of data || []) {
        addPhoneVariants(phonesToExpand, r.phone_e164);
        addPhoneVariants(phonesToExpand, r.phone);
      }
    }

    // 3b) Si WAHA a livré une notif à un vrai vendeur via `<lid>@lid`,
    // `waouh_outbound_queue.last_error` garde "delivered via <lid>@lid".
    // Cela permet de relier immédiatement la réponse entrante LID au `to_user_id`
    // ciblé, même avant qu'un mapping LID→phone exploitable soit créé.
    if (lidsToExpand.size > 0) {
      const lidJids = [...lidsToExpand].map((l) => `${l}@lid`);
      const markers = lidJids.map((jid) => `delivered via ${jid}`);
      const { data } = await sb
        .from("waouh_outbound_queue")
        .select("to_user_id, to_phone")
        .eq("status", "sent")
        .in("last_error", markers)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const r of data || []) {
        if (r.to_user_id) ids.add(r.to_user_id);
        addPhoneVariants(phonesToExpand, r.to_phone);
      }
    }

    if (phonesToExpand.size > 0) {
      // Trouver tous les LIDs qui pointent vers ces phones.
      const phonesArr = [...phonesToExpand];
      const orClauses = [
        `phone.in.(${phonesArr.map((p) => `"${p}"`).join(",")})`,
        `phone_e164.in.(${phonesArr.map((p) => `"${p}"`).join(",")})`,
      ].join(",");
      const { data } = await sb
        .from("waouh_lid_phone_map")
        .select("lid")
        .or(orClauses)
        .limit(20);
      for (const r of data || []) {
        if (r.lid) lidsToExpand.add(r.lid);
      }
    }

    // 4) Charger tous les waouh_users qui matchent ces phones et LIDs.
    if (phonesToExpand.size > 0) {
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .in("phone_number", [...phonesToExpand])
        .limit(50);
      for (const r of data || []) ids.add(r.id);
    }
    if (lidsToExpand.size > 0) {
      const lidPhoneVariants = [...lidsToExpand].map((l) => `${l}@lid`);
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .in("phone_number", lidPhoneVariants)
        .limit(50);
      for (const r of data || []) ids.add(r.id);
    }
  } catch (e) {
    console.warn("[resolveSiblingUserIds] failed", e);
  }

  return [...ids];
}

/**
 * Filtre `or(buyer_user_id.in.(...),seller_user_id.in.(...))` PostgREST.
 * Renvoie une chaîne prête pour `.or(...)` dans le builder Supabase.
 */
export function siblingOrFilter(ids: string[]): string {
  const safe = ids.filter((x) => typeof x === "string" && x.length > 0);
  if (safe.length === 0) return "buyer_user_id.eq.00000000-0000-0000-0000-000000000000";
  const list = `(${safe.join(",")})`;
  return `buyer_user_id.in.${list},seller_user_id.in.${list}`;
}

const NEG_SIBLING_CHUNK = 40;

/**
 * Négociations ouvertes d'une personne (toutes ses identités), sans faire exploser l'URL PostgREST.
 * Un compte App peut avoir ~200 lignes waouh_users : `buyer_user_id.in.(…200 uuid…)` dépasse la limite d'URL, la requête
 * échoue en silence (data = null) et le parcours croit qu'aucune négociation n'existe (contre-offre perdue, constaté en production).
 * Les identités sont donc interrogées par paquets, puis fusionnées (plus récente d'abord).
 */
export async function openNegotiationsForSiblings(
  sb: any,
  ids: string[],
  opts: {
    select?: string;
    articleId?: string | null;
    threadId?: string | null;
    negotiationId?: string | null;
    side?: "buyer" | "seller" | "any";
    states?: string[];
    limit?: number;
  } = {},
): Promise<any[]> {
  const unique = [...new Set((ids || []).filter((x) => typeof x === "string" && x.length > 0))];
  if (unique.length === 0) return [];
  const side = opts.side ?? "any";
  const states = opts.states ?? ["proposed", "countered"];
  const select = opts.select ?? "*";
  const merged = new Map<string, any>();
  for (let i = 0; i < unique.length; i += NEG_SIBLING_CHUNK) {
    const chunk = unique.slice(i, i + NEG_SIBLING_CHUNK);
    let q: any = sb.from("waouh_negotiations").select(select).in("state", states);
    if (opts.negotiationId) q = q.eq("id", opts.negotiationId);
    if (opts.threadId) q = q.eq("thread_id", opts.threadId);
    if (opts.articleId) q = q.eq("article_id", opts.articleId);
    if (side === "buyer") q = q.in("buyer_user_id", chunk);
    else if (side === "seller") q = q.in("seller_user_id", chunk);
    else q = q.or(siblingOrFilter(chunk));
    const { data, error } = await q.order("updated_at", { ascending: false }).limit(opts.limit ?? 25);
    if (error) console.warn("[openNegotiationsForSiblings]", error.message);
    for (const row of data || []) merged.set(row.id, row);
  }
  return [...merged.values()]
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
    .slice(0, opts.limit ?? 25);
}
