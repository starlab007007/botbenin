import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  marketStats,
  priceFitScore,
  rankArticle,
  rankBuyer,
  tokenRelevance,
} from "./waouh-nexus.ts";

Deno.test("NEXUS comprend une requête malgré le bruit conversationnel", () => {
  const score = tokenRelevance(
    "Je cherche un Samsung S25 256 Go à Cotonou",
    "Samsung Galaxy S25 256 Go smartphone neuf",
  );
  assert(score >= 70);
});

Deno.test("NEXUS pénalise fortement une offre hors budget", () => {
  assert(priceFitScore(600000, 400000) < priceFitScore(350000, 400000));
});

Deno.test("NEXUS recommande prix + confiance + ville + fraîcheur", () => {
  const result = rankArticle({
    query: "Samsung S25 256 Go",
    budgetMax: 450000,
    city: "Cotonou",
    now: Date.parse("2026-09-24T12:00:00Z"),
    article: {
      id: "a1",
      title: "Samsung Galaxy S25 256 Go",
      category: "smartphone",
      brand: "Samsung",
      price: 390000,
      city: "Cotonou",
      status: "active",
      updated_at: "2026-09-24T08:00:00Z",
      seller: { is_verified: true, reputation: 4.8, sales_count: 12 },
    },
  });
  assert(result.total_score >= 80);
  assert(result.reasons.includes("Prix dans votre budget"));
  assert(result.reasons.includes("Dans votre ville"));
});

Deno.test("NEXUS score un acheteur compatible avec un article vendeur", () => {
  const result = rankBuyer({
    article: { title: "iPhone 15 Pro 256 Go", category: "smartphone", price: 480000, city: "Cotonou" },
    buyer: {
      query_text: "cherche iPhone 15 Pro",
      keywords: ["iphone", "15", "pro"],
      category: "smartphone",
      price_max: 500000,
      is_active: true,
      created_at: "2026-09-24T08:00:00Z",
      user: { city: "Cotonou" },
    },
    now: Date.parse("2026-09-24T12:00:00Z"),
  });
  assert(result.total_score >= 75);
});

Deno.test("NEXUS calcule une synthèse de marché robuste", () => {
  assertEquals(marketStats([100000, 120000, 140000, null]), {
    min: 100000,
    median: 120000,
    max: 140000,
    average: 120000,
    sample_count: 3,
  });
});
