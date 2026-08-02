// waouh-status-publish
// Promotes a published WAOUH "status" to a first-class waouh_articles entry
// when type='sell', so it flows through the exact same pipeline as a chat-published
// product (search, buyer notifications, negotiation, deal).
//
// Body: {
//   type: 'sell'|'buy'|'announce',
//   title: string,
//   caption?: string,
//   price_fcfa?: number,
//   location?: string,
//   lat?: number, lng?: number,
//   media_urls?: string[],
//   media_kind?: 'image'|'video',
//   author_name?: string,
//   author_avatar_url?: string,
//   waouh_code?: string,
// }
// Auth: requires Authorization Bearer <user JWT>.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const {
      type,
      title,
      caption = null,
      price_fcfa = null,
      location = null,
      lat = null,
      lng = null,
      media_urls = [],
      media_kind = null,
      author_name = null,
      author_avatar_url = null,
      waouh_code = null,
      idempotency_key = null,
    } = body || {};

    if (!type || !["sell", "buy", "announce"].includes(type)) {
      return new Response(JSON.stringify({ error: "invalid type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!title || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve auth user
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUser = userData.user;
    const authUserId = authUser.id;
    const operationKey = typeof idempotency_key === "string"
      ? idempotency_key.trim()
      : "";
    if (operationKey) {
      const { data: existingStatus } = await sb.from("waouh_statuses")
        .select("*")
        .eq("idempotency_key", operationKey)
        .maybeSingle();
      if (existingStatus?.id) {
        return new Response(JSON.stringify({
          ok: true,
          duplicate: true,
          status: existingStatus,
          article: null,
          article_id: existingStatus.article_id ?? null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Resolve / create waouh_users row by auth_user_id
    let waouhUserId: string | null = null;
    let contactWhatsapp: string | null = null;
    {
      const { data: existing } = await sb
        .from("waouh_users")
        .select("id, phone_number")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (existing) {
        waouhUserId = existing.id;
        contactWhatsapp = (existing as any).phone_number ?? null;
      } else {
        const meta: any = authUser.user_metadata ?? {};
        const phoneCandidate =
          (authUser as any).phone ||
          meta.phone ||
          meta.phone_number ||
          null;
        const { data: created, error: cErr } = await sb
          .from("waouh_users")
          .insert({
            auth_user_id: authUserId,
            phone_number: phoneCandidate,
            display_name: author_name || meta.full_name || authUser.email || null,
            city: location || null,
            channel: "web",
          })
          .select("id, phone_number")
          .single();
        if (cErr) throw cErr;
        waouhUserId = created.id;
        contactWhatsapp = (created as any).phone_number ?? null;
      }
    }

    let articleId: string | null = null;
    let article: any = null;

    // Promote sell-statuses with a price to a real article
    if (type === "sell") {
      const photos: string[] = Array.isArray(media_urls) ? media_urls.filter(Boolean) : [];
      const locWkt = (lat != null && lng != null)
        ? `SRID=4326;POINT(${lng} ${lat})`
        : null;

      const { data: art, error: artErr } = await sb
        .from("waouh_articles")
        .insert({
          seller_id: waouhUserId,
          title,
          description: caption,
          category: "autre",
          condition: "good",
          price: price_fcfa ?? 0,
          currency: "XOF",
          photos,
          location: locWkt,
          city: location,
          status: "active",
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          origin: "status",
          source_channel: "status",
          contact_whatsapp: contactWhatsapp,
        })
        .select()
        .single();
      if (artErr) throw artErr;
      article = art;
      articleId = art.id;
    }

    // Insert status row linked to the article
    const { data: status, error: sErr } = await sb
      .from("waouh_statuses")
      .insert({
        user_id: authUserId,
        author_name,
        author_avatar_url,
        type,
        title,
        caption,
        price_fcfa,
        location,
        lat,
        lng,
        media_url: (media_urls && media_urls[0]) || null,
        media_urls: media_urls ?? [],
        media_kind,
        article_id: articleId,
        waouh_code,
        idempotency_key: operationKey || null,
      })
      .select()
      .single();
    if (sErr) {
      if ((sErr as any).code === "23505" && operationKey) {
        const { data: replay } = await sb.from("waouh_statuses")
          .select("*")
          .eq("idempotency_key", operationKey)
          .maybeSingle();
        return new Response(JSON.stringify({
          ok: true,
          duplicate: true,
          status: replay,
          article: null,
          article_id: replay?.article_id ?? null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw sErr;
    }

    // Fan-out to existing matching buyers (fire & forget)
    if (articleId) {
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-buyers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, status, article, article_id: articleId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[waouh-status-publish] error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
