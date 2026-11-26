import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalCategory, deadlineAcceptable, mergeResults, needsMore, neighborCities } from "./waouh-track-sources.ts";

Deno.test("un service avec moins de 3 résultats déclenche l'élargissement", () => {
  assertEquals(needsMore("service", 2), true);
  assertEquals(needsMore("service", 3), false);
});
Deno.test("Cotonou s'élargit à Abomey-Calavi", () => assertEquals(neighborCities("cotonou").includes("Abomey-Calavi"), true));
Deno.test("une opportunité close n'est pas proposée", () => {
  assertEquals(deadlineAcceptable("opportunity", Date.now() - 1000), false);
  assertEquals(deadlineAcceptable("purchase", null), true);
});
Deno.test("les doublons ne sont pas fusionnés deux fois", () => {
  const r = mergeResults([{ fabric_id: "a" }], [{ fabric_id: "a" }, { fabric_id: "b" }], { nearby: true });
  assertEquals(r.length, 2);
});
Deno.test("Smartphones et Téléphonie ont la même catégorie", () => {
  assertEquals(canonicalCategory("Smartphones"), canonicalCategory("Téléphonie"));
});
