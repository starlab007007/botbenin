// Source-of-truth loader for WaouhMatchChatWindow.
// Returns the full per-article chat history for the calling viewer
// (auth user + linked waouh_users + web session) regardless of timing/race
// conditions on the client. The window uses this to render history
// authoritatively from DB instead of relying on localStorage cache.
//
// Hardened against session loss after refresh:
//   - resolves waouh_users via authUserId AND/OR sessionId
//   - safe article-scoped fallback when the viewer is provably linked to
//     the article (seller_id match OR an existing notification linking
//     this auth user / session to the article). Prevents the "empty chat
//     after refresh" symptom when the local web_session_id is rotated.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const body = await req.json().catch(() => ({}));
    const articleId: string | null = body?.articleId ?? null;
    const sessionId: string | null = body?.sessionId ?? null;
    const authUserId: string | null = body?.authUserId ?? null;
    const role: "buyer" | "seller" = body?.role === "seller" ? "seller" : "buyer";
    const before: string | null = body?.before ?? null;
    const rawLimit = Number(body?.limit ?? 30);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1), 200);
    const includeMeta = body?.includeMeta !== false;
    const notificationId: string | null = body?.notificationId ?? null;
    // v12 — seller windows scoped per counterpart (one tab per interested buyer)
    const counterpartUserId: string | null = body?.counterpartUserId ?? null;


    if (!articleId) {
      return new Response(JSON.stringify({ ok: false, error: "missing articleId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sessionId && !authUserId) {
      return new Response(JSON.stringify({ ok: false, error: "missing viewer identity" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Resolve every waouh_users.id linked to this viewer (auth user OR web session).
    const ors: string[] = [];
    if (authUserId) ors.push(`auth_user_id.eq.${authUserId}`);
    if (sessionId) ors.push(`web_session_id.eq.${sessionId}`);
    const { data: users } = await sb
      .from("waouh_users")
      .select("id, auth_user_id, web_session_id, phone_number")
      .or(ors.join(","))
      .limit(100);
    const userIds = Array.from(new Set((users ?? []).map((u: any) => u.id)));

    // 2) Pull article-scoped messages. Server-side OR handles legacy rows
    //    where article_id is only in meta.
    let q: any = sb
      .from("waouh_messages")
      .select("id,direction,text,created_at,attachments,meta,article_id,user_id,web_session_id")
      .or(`article_id.eq.${articleId},meta->>article_id.eq.${articleId}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data: rowsRaw, error: rowsErr } = await q;
    if (rowsErr) throw rowsErr;
    const allRows: any[] = rowsRaw ?? [];

    // 3) Determine viewer link strength to the article. The viewer is
    //    "authoritatively linked" if:
    //      a) one of their waouh_users.id is the article's seller_id, OR
    //      b) any waouh_notifications row scoped to this auth user / web
    //         session references this article (i.e. they were notified as
    //         buyer or seller), OR
    //      c) any message already in `allRows` belongs to one of their IDs
    //         or web_session_id.
    const userIdSet = new Set(userIds);
    const sessionMatchInRows = sessionId
      ? allRows.some((m) => m.web_session_id === sessionId)
      : false;
    const userMatchInRows = allRows.some((m) => m.user_id && userIdSet.has(m.user_id));

    let isSeller = false;
    try {
      const { data: art } = await sb
        .from("waouh_articles")
        .select("seller_id, status")
        .eq("id", articleId)
        .maybeSingle();
      if (art?.seller_id && userIdSet.has((art as any).seller_id)) isSeller = true;
      // articleStatus computed in step 4 below; refetch is cheap, but reuse here:
      (globalThis as any).__waouhArticleCache = art;
    } catch (_e) { /* noop */ }

    // Status fallback: when articleId points to a waouh_statuses row (status-driven
    // chat created via StatusCard) instead of a waouh_articles row, treat the
    // status owner as the authoritative seller so they see all article-scoped
    // history.
    let isStatusOwner = false;
    try {
      const { data: st } = await sb
        .from("waouh_statuses" as any)
        .select("user_id")
        .eq("id", articleId)
        .maybeSingle();
      if (st && (st as any).user_id) {
        const ownerId = (st as any).user_id as string;
        if (authUserId && ownerId === authUserId) {
          isStatusOwner = true;
          isSeller = true;
        }
      }
    } catch (_e) { /* noop */ }

    let notifiedForArticle = false;
    if (!isSeller && !sessionMatchInRows && !userMatchInRows) {
      const notifOrs: string[] = [];
      if (userIds.length) notifOrs.push(`user_id.in.(${userIds.join(",")})`);
      if (sessionId) notifOrs.push(`web_session_id.eq.${sessionId}`);
      if (notifOrs.length) {
        const { data: notifs } = await sb
          .from("waouh_notifications")
          .select("id")
          .eq("article_id", articleId)
          .or(notifOrs.join(","))
          .limit(1);
        notifiedForArticle = !!(notifs && notifs.length);
      }
    }

    const authoritativeViewer =
      isSeller || isStatusOwner || sessionMatchInRows || userMatchInRows || notifiedForArticle;

    // 4) Filter messages STRICTLY by viewer ownership.
    //    waouh_messages stores one row per recipient (pushToOther writes
    //    a row for each side, each with user_id = the target waouh_user).
    //    Returning all article-scoped rows to an "authoritative" viewer
    //    leaked the other party's bubbles (seller saw "✅ Demande envoyée
    //    au vendeur", buyer saw "📩 Nouvel acheteur intéressé" /
    //    "✅ Annonce publiée"). Strict per-viewer ownership keeps the
    //    fenêtre in sync with the chat principal without cross-party leak.
    const SELF_ACK_TEMPLATES = new Set([
      "buyer_interest_ack",
      "negotiation_ack",
      "payment_ack",
      "sale_published",
    ]);
    const isSelfAck = (m: any) => {
      const tpl = m?.meta?.template;
      if (!tpl) return false;
      if (SELF_ACK_TEMPLATES.has(tpl)) return true;
      return typeof tpl === "string" && /_ack$/.test(tpl);
    };
    const viewerOwnsMessage = (m: any) => {
      if (sessionId && m.web_session_id === sessionId) return true;
      if (m.user_id && userIdSet.has(m.user_id)) return true;
      return false;
    };

    const baseRows = allRows.filter(viewerOwnsMessage);
    // Defensive: strip self-ack rows that somehow don't belong to viewer.
    let rows = baseRows.filter((m: any) => !isSelfAck(m) || viewerOwnsMessage(m));
    // v12 — seller history scoped to a single counterpart (buyer) so each
    // interested buyer gets their own WaouhMatchChatWindow with isolated history.
    if (role === "seller" && counterpartUserId) {
      rows = rows.filter((m: any) => {
        const cp = m?.meta?.counterpart_user_id ?? m?.meta?.buyer_user_id ?? null;
        return cp === counterpartUserId || m?.user_id === counterpartUserId;
      });
    }
    // v13 — côté acheteur, on isole aussi par contrepartie (vendeur) quand
    // l'information est présente. Filtre indulgent : les lignes historiques
    // sans contrepartie en meta restent visibles (pas de perte d'historique).
    if (role === "buyer" && counterpartUserId) {
      rows = rows.filter((m: any) => {
        const cp =
          m?.meta?.counterpart_user_id ?? m?.meta?.seller_user_id ?? null;
        return !cp || cp === counterpartUserId;
      });
    }

    const messages = rows.slice().reverse(); // ASC for client
    const hasMore = allRows.length === limit;


    // 5) Optional meta: article status + seed notification.
    let articleStatus: string | null = null;
    let seedNotification: { sent_at: string; notification_type: string; text: string | null } | null = null;
    if (includeMeta) {
      const cachedArt = (globalThis as any).__waouhArticleCache;
      if (cachedArt && typeof cachedArt.status !== "undefined") {
        articleStatus = (cachedArt as any).status ?? null;
      } else {
        const { data: art } = await sb
          .from("waouh_articles")
          .select("status")
          .eq("id", articleId)
          .maybeSingle();
        articleStatus = (art as any)?.status ?? null;
      }

      let seedRaw: any = null;
      if (notificationId) {
        const { data } = await sb
          .from("waouh_notifications")
          .select("sent_at,notification_type,payload")
          .eq("id", notificationId)
          .maybeSingle();
        seedRaw = data;
      } else {
        const types = role === "seller"
          ? ["new_buyer", "match", "match_seller", "radar_match"]
          : ["match", "match_buyer", "radar_match"];
        let nq: any = sb
          .from("waouh_notifications")
          .select("sent_at,notification_type,payload")
          .eq("article_id", articleId)
          .in("notification_type", types)
          .order("sent_at", { ascending: false })
          .limit(1);
        if (userIds.length || sessionId) {
          const orParts: string[] = [];
          if (userIds.length) orParts.push(`user_id.in.(${userIds.join(",")})`);
          if (sessionId) orParts.push(`web_session_id.eq.${sessionId}`);
          nq = nq.or(orParts.join(","));
        }
        const { data } = await nq;
        seedRaw = Array.isArray(data) ? data[0] : data;
      }
      if (seedRaw) {
        seedNotification = {
          sent_at: seedRaw.sent_at,
          notification_type: seedRaw.notification_type,
          text: (seedRaw.payload as any)?.text ?? null,
        };
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      messages,
      hasMore,
      articleStatus,
      seedNotification,
      viewer: {
        userIds,
        sessionId,
        authUserId,
        isSeller,
        isStatusOwner,
        notifiedForArticle,
        authoritative: authoritativeViewer,
      },
      synced_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[waouh-match-history] error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
