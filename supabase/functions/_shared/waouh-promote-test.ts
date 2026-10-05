import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { catalogSourceChannel, normalizeArticleCategory } from "./waouh-promote.ts";

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
