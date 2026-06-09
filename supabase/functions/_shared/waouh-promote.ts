// Shared promoter: materializes a partner/catalog entry into a real
// waouh_articles row so the negotiation tunnel (which requires article_id)
// works for items posted by partners. Idempotent.

export interface PromoteResult {
  article_id: string | null;
  catalog_id: string;
  created: boolean;
  reason?: string;
}

export async function promoteCatalogToArticle(
  sb: any,
  catalog_id: string,
  overrides: { seller_id?: string | null; category?: string | null } = {},
): Promise<PromoteResult> {
  if (!catalog_id) return { article_id: null, catalog_id, created: false, reason: "no catalog_id" };

  const { data: cat } = await sb
    .from("waouh_unified_catalog")
    .select("id, source, source_ref_id, titre, description, categorie, prix_min, prix_max, devise, ville, vendeur_whatsapp, vendeur_phone, vendeur_nom, partner_id, promoted_article_id, photos, image_url")
    .eq("id", catalog_id)
    .maybeSingle();

  if (!cat) return { article_id: null, catalog_id, created: false, reason: "catalog row missing" };
  if (cat.promoted_article_id) {
    return { article_id: cat.promoted_article_id, catalog_id, created: false };
  }

  const price = cat.prix_min ?? cat.prix_max ?? null;
  const photos = Array.isArray(cat.photos) ? cat.photos
    : (cat.image_url ? [cat.image_url] : []);
  const sourceChannel =
    cat.source === "partner" ? "partner" :
    cat.source === "radar_ia" ? "radar_ia" : "waouh_app";

  const { data: article, error } = await sb
    .from("waouh_articles")
    .insert({
      seller_id: overrides.seller_id ?? null,
      title: cat.titre || "Article partenaire",
      description: cat.description || null,
      category: cat.categorie || overrides.category || "autre",
      price,
      currency: cat.devise || "XOF",
      photos,
      city: cat.ville || null,
      status: "active",
      origin: cat.source === "partner" ? "partner" : (cat.source || "waouh_app"),
      source_channel: sourceChannel,
      contact_whatsapp: cat.vendeur_whatsapp || cat.vendeur_phone || null,
      partner_id: cat.partner_id || null,
    })
    .select("id")
    .maybeSingle();

  if (error || !article?.id) {
    return { article_id: null, catalog_id, created: false, reason: String(error?.message || "insert failed") };
  }

  await sb.from("waouh_unified_catalog")
    .update({ promoted_article_id: article.id })
    .eq("id", catalog_id);

  return { article_id: article.id, catalog_id, created: true };
}
