import { describe, expect, it } from "vitest";
import { buildSummary, externalSteps, internalSteps, maskPhone, planSteps, sameZone } from "../liveReasoning";

const ctx = { query: "Moto Bajaj", city: "Cotonou", budget: 500000 };

describe("liveReasoning", () => {
  it("masque le numéro en ne gardant que les 4 derniers chiffres", () => {
    expect(maskPhone("1234")).toBe("+229 •• •• 12 34");
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone("7")).toBeNull();
  });

  it("compare les zones sans accents ni casse", () => {
    expect(sameZone("COTONOU", "cotonou")).toBe(true);
    expect(sameZone("Abomey-Calavi", "Calavi")).toBe(true);
    expect(sameZone("Parakou", "Cotonou")).toBe(false);
    expect(sameZone(null, "Cotonou")).toBe(false);
  });

  it("annonce honnêtement l'absence de résultats", () => {
    const internal = internalSteps({ query: "x", market: { min: null, median: null, max: null, average: null, sample_count: 0 }, results: [] }, ctx);
    expect(internal[0].tone).toBe("warn");
    const external = externalSteps({ results: [] }, ctx);
    expect(external[0].tone).toBe("warn");
    expect(buildSummary(null, null, ctx).found).toBe(0);
  });

  it("décrit le plan à partir de la demande réelle", () => {
    const steps = planSteps(ctx);
    expect(steps[0].text).toContain("Moto Bajaj");
    expect(steps[0].chips).toContain("📍 Cotonou");
  });

  it("n'invente aucun contact : sans canal masqué, pas de téléphone", () => {
    const steps = externalSteps({
      results: [{
        fabric_id: "f1", source_key: "google_places", intent: "SELL", city: "Cotonou", subject: "Moto",
        price_min: 450000, currency: "XOF",
        scores: { total_score: 70, relevance_score: 70, intent_score: 70, trust_score: 70, price_score: 70, location_score: 70, freshness_score: 70, contactability_score: 0, reasons: [] },
        contact_policy: { level: "C0", can_reveal: false, can_auto_contact: false, requires_approval: true, label: "Public" },
      }],
      source_mix: { google_places: 1 },
    }, ctx);
    const all = steps.flatMap((s) => s.evidence ?? []);
    expect(all.every((e) => !e.phone)).toBe(true);
    expect(steps.some((s) => s.id === "ext-contact")).toBe(false);
  });
});
