import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { catalogSourceChannel, normalizeArticleCategory, promoteCatalogToArticle } from "./waouh-promote.ts";

Deno.test("Catalogue: partner reste un canal partenaire", () => {
  assertEquals(catalogSourceChannel("partner"), "partner");
});

Deno.test("Catalogue: radar et radar_ia convergent vers radar_ia", () => {
  assertEquals(catalogSourceChannel("radar"), "radar_ia");
  assertEquals(catalogSourceChannel("radar_ia"), "radar_ia");
});

Deno.test("Catalogue: sources internes ou inconnues restent WAOUH app", () => {
  assertEquals(catalogSourceChannel("chat"), "waouh_app");
  assertEquals(catalogSourceChannel("waouh_app"), "waouh_app");
  assertEquals(catalogSourceChannel(null), "waouh_app");
});

Deno.test("Catalogue: la catégorie reste normalisée pour la promotion", () => {
  assertEquals(normalizeArticleCategory("Téléphone"), "smartphone");
  assertEquals(normalizeArticleCategory("Mode & Vêtements"), "vetement");
});


function fakePromotionDb() {
  const state: Record<string, any[]> = {
    waouh_unified_catalog: [{
      id: "catalog-1",
      source: "chat",
      source_ref_id: "article-1",
      titre: "Produit",
      description: null,
      categorie: "autre",
      prix_min: 1000,
      prix_max: 1000,
      devise: "XOF",
      ville: "Cotonou",
      vendeur_whatsapp: null,
      vendeur_phone: null,
      vendeur_nom: "Vendeur",
      partner_id: null,
      promoted_article_id: null,
      photos: [],
      is_active: true,
    }],
    waouh_articles: [{
      id: "article-1",
      seller_id: "seller-1",
      status: "active",
    }],
  };
  return {
    state,
    from(table: string) {
      const filters: Array<(row: any) => boolean> = [];
      let patch: Record<string, unknown> | null = null;
      const rows = state[table] ?? [];
      const pick = () => rows.filter((row) => filters.every((fn) => fn(row)));
      const api: any = {
        select: () => api,
        update: (value: Record<string, unknown>) => { patch = value; return api; },
        eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return api; },
        maybeSingle: () => Promise.resolve({ data: pick()[0] ?? null, error: null }),
        then: (resolve: any) => {
          if (patch) pick().forEach((row) => Object.assign(row, patch));
          return Promise.resolve({ data: pick(), error: null }).then(resolve);
        },
      };
      return api;
    },
  };
}

Deno.test("Catalogue Chat: réutilise l’article source canonique sans clone", async () => {
  const db = fakePromotionDb();
  const result = await promoteCatalogToArticle(db as any, "catalog-1");
  assertEquals(result.article_id, "article-1");
  assertEquals(result.created, false);
  assertEquals(db.state.waouh_unified_catalog[0].promoted_article_id, "article-1");
  assertEquals(db.state.waouh_articles.length, 1);
});
