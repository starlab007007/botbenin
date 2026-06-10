// WAOUH — Radar IA inbound context helper.
//
// Quand le webhook envoie un template `radar_buyer_outreach` à un acheteur
// scrapé par Radar IA, on conserve la trace dans `waouh_outbound_queue`
// (template + payload.article_id). Sans hydratation, la réponse "OUI"/"Je
// propose X" de l'acheteur arrive sans contexte → "Aucune négociation".
//
// `findRadarOutreachContext(sb, phone)` recherche l'outreach le plus récent
// (7 derniers jours) pour ce numéro (toutes variantes Bénin) et renvoie
// l'article actif lié + l'id du signal, pour reconstruire `last_matches` et
// `current_article_id` côté webhook avant la classification d'intent.

export interface RadarOutreachContext {
  article: {
    id: string;
    title: string;
    price: number | null;
    seller_id: string | null;
    photos: any;
    market_price_min: number | null;
    market_price_max: number | null;
  };
  radarSignalId: string | null;
  sentAt: string;
}

function addPhoneVariants(out: Set<string>, value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return;
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

export async function findRadarOutreachContext(
  sb: any,
  phone: string | null | undefined,
): Promise<RadarOutreachContext | null> {
  if (!phone || phone.startsWith("web:")) return null;

  const variants = new Set<string>();
  addPhoneVariants(variants, phone);
  if (variants.size === 0) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: rows, error } = await sb
      .from("waouh_outbound_queue")
      .select("id, to_phone, payload, created_at, status")
      .eq("template", "radar_buyer_outreach")
      .in("to_phone", [...variants])
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !rows?.length) return null;

    for (const row of rows) {
      const payload = (row.payload || {}) as any;
      const articleId: string | null = payload.article_id ?? null;
      const radarSignalId: string | null = payload.radar_signal_id ?? null;
      if (!articleId) continue;

      const { data: art } = await sb
        .from("waouh_articles")
        .select("id, title, price, seller_id, photos, status, market_price_min, market_price_max")
        .eq("id", articleId)
        .maybeSingle();
      if (!art) continue;
      const status = String(art.status || "").toLowerCase();
      if (["sold", "closed", "finalized", "completed", "vendu"].includes(status)) continue;

      return {
        article: {
          id: art.id,
          title: art.title,
          price: art.price,
          seller_id: art.seller_id,
          photos: art.photos,
          market_price_min: art.market_price_min,
          market_price_max: art.market_price_max,
        },
        radarSignalId,
        sentAt: row.created_at,
      };
    }
  } catch (e) {
    console.warn("[findRadarOutreachContext] failed", e);
  }
  return null;
}
