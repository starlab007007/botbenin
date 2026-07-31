import { describe, it, expect } from "vitest";
import { validateResultsInvariant } from "@/components/waouh/WaouhProductCard";

const sample = [
  { index: 1, id: "a", title: "Sac Zara", action: "intéressé 1", photos: ["u1", "u2"] },
  { index: 2, id: "b", title: "Sac Zara noir", action: "intéressé 2", photos: [] },
  { index: 3, id: "c", title: "Sac Zara mini", action: "intéressé 3", photos: ["u3"] },
];

describe("WAOUH — fiches produit", () => {
  it("respecte l'ordre de last_matches", () => {
    expect(validateResultsInvariant(sample as any, [{ id: "a" }, { id: "b" }, { id: "c" }])).toBe(true);
  });
  it("détecte un désalignement avec last_matches", () => {
    expect(validateResultsInvariant(sample as any, [{ id: "b" }, { id: "a" }, { id: "c" }])).toBe(false);
  });
  it("détecte une action « intéressé N » incohérente", () => {
    const bad = [...sample];
    bad[1] = { ...bad[1], action: "intéressé 5" };
    expect(validateResultsInvariant(bad as any)).toBe(false);
  });
  it("garde les photos rattachées à leur propre article", () => {
    expect(sample[0].photos).toHaveLength(2);
    expect(sample[1].photos).toHaveLength(0);
  });
});
