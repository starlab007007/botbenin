// Shared promoter: materializes a partner/catalog entry into a real
// waouh_articles row so the negotiation tunnel (which requires article_id)
// works for items posted by partners. Idempotent.

import { ensureWaouhVendorStub } from "./waouh-phone.ts";

export interface PromoteResult {
  article_id: string | null;
  catalog_id: string;
  created: boolean;
  reason?: string;
}

/**
 * Normalise une catégorie libre (catalogue partenaire / radar) vers l'une
 * des 7 valeurs acceptées par la CHECK constraint `waouh_articles_category_check`.
 * Sans ça, des libellés type "Mode & Vêtements", "Téléphone", etc. font
 * échouer la promotion catalog→article et bloquent la négociation
 * (scénarios B/C — l'utilisateur voit "Cet article ne peut pas être
 * négocié pour l'instant").
 */
export function normalizeArticleCategory(value: string | null | undefined): string {
  const v = String(value || "").toLowerCase();
  if (!v) return "autre";
  // valeurs déjà canoniques
  if (["smartphone", "ordinateur", "vetement", "vehicule", "electromenager", "meuble", "autre"].includes(v)) return v;
  if (/t[ée]l[ée]phone|smartphone|iphone|android|mobile|portable|tecno|samsung|infinix|itel/.test(v)) return "smartphone";
  if (/ordinateur|pc|laptop|macbook|notebook/.test(v)) return "ordinateur";
  if (/v[êe]tement|tissu|chaussure|mode|habit|sac|accessoire/.test(v)) return "vetement";
  if (/voiture|moto|v[ée]hicule|auto|scooter|tricycle/.test(v)) return "vehicule";
  if (/frigo|cong[ée]lateur|machine|[ée]lectrom[ée]nager|t[ée]l[ée]vision|tv|climatiseur|ventilateur/.test(v)) return "electromenager";
  if (/maison|logement|immobilier|location|terrain|chambre|salon|meuble|table|chaise|lit/.test(v)) return "meuble";
  return "autre";
}

export async function promoteCatalogToArticle(
  sb: any,
  catalog_id: string,
  overrides: { seller_id?: string | null; category?: string | null } = {},
): Promise<PromoteResult> {
  if (!catalog_id) return { article_id: null, catalog_id, created: false, reason: "no catalog_id" };

  const { data: cat, error: selErr } = await sb
    .from("waouh_unified_catalog")
    .select("id, source, source_ref_id, titre, description, categorie, prix_min, prix_max, devise, ville, vendeur_whatsapp, vendeur_phone, vendeur_nom, partner_id, promoted_article_id, photos, is_active")
    .eq("id", catalog_id)
    .maybeSingle();

  if (!cat) return { article_id: null, catalog_id, created: false, reason: `catalog row missing: ${selErr?.message ?? "no data"}` };
  if (cat.is_active === false) {
    return { article_id: null, catalog_id, created: false, reason: "catalog inactive" };
  }

  // Une offre partenaire doit avoir un interlocuteur canonique avant d'entrer
  // dans le tunnel transactionnel. Si nécessaire, matérialiser un vendeur
  // WhatsApp à partir du contact réel du catalogue.
  let sellerId = overrides.seller_id ?? null;
  if (!sellerId) {
    const stub = await ensureWaouhVendorStub(
      sb,
      cat.vendeur_whatsapp || cat.vendeur_phone || null,
      {
        display_name: cat.vendeur_nom || cat.titre || "Vendeur partenaire",
        city: cat.ville || null,
        stub_origin: cat.source === "partner" ? "partner" : "catalog",
      },
    );
    sellerId = stub?.id ?? null;
  }

  if (cat.promoted_article_id) {
    const { data: promoted } = await sb.from("waouh_articles")
      .select("id,seller_id,status")
      .eq("id", cat.promoted_article_id)
      .maybeSingle();

    const unavailable = new Set(["sold", "reserved", "archived", "deleted"]);
    const promotedStatus = String(promoted?.status || "").toLowerCase();

    // Les anciens articles promus restent une source d'identité vendeur
    // fiable, même quand leur cycle transactionnel est terminé.
    if (!sellerId && promoted?.seller_id) {
      sellerId = promoted.seller_id;
    }

    // Le catalogue reste l'autorité. Une fiche catalogue active ne doit pas
    // réutiliser un ancien article transactionnel déjà vendu/réservé.
    if (promoted?.id && !unavailable.has(promotedStatus)) {
      if (sellerId && !promoted.seller_id) {
        await sb.from("waouh_articles")
          .update({ seller_id: sellerId })
          .eq("id", promoted.id)
          .is("seller_id", null);
      }
      return { article_id: promoted.id, catalog_id, created: false };
    }
    // Article absent ou terminal : continuer ci-dessous et matérialiser une
    // nouvelle fiche canonique, puis remplacer promoted_article_id.
  }

  const price = cat.prix_min ?? cat.prix_max ?? null;
  const photos = Array.isArray(cat.photos) ? cat.photos : [];
  const sourceChannel =
    cat.source === "partner" ? "partner" :
    cat.source === "radar_ia" ? "radar_ia" : "waouh_app";

  // 🔒 Normalisation OBLIGATOIRE : la table waouh_articles a une CHECK
  // constraint stricte (smartphone/ordinateur/vetement/vehicule/
  // electromenager/meuble/autre). On accepte la valeur brute du catalogue
  // OU l'override caller, mais on les fait toujours passer par le
  // normalisateur partagé.
  const rawCategory = overrides.category ?? cat.categorie ?? null;
  const normalizedCategory = normalizeArticleCategory(rawCategory);

  const { data: article, error } = await sb
    .from("waouh_articles")
    .insert({
      seller_id: sellerId,
      title: cat.titre || "Article partenaire",
      description: cat.description || null,
      category: normalizedCategory,
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
