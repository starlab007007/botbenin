import { describe, expect, it } from "vitest";
import { buildSummary, externalSteps, internalSteps, maskPhone, methodSteps, planSteps, sameZone } from "../liveReasoning";

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

  it("explique la méthode et le plan réel sans rien inventer", () => {
    expect(planSteps(ctx).some((step) => step.id === "method")).toBe(true);
    expect(methodSteps(null)).toEqual([]);
    const steps = methodSteps({
      mode: "find_sellers", normalized_query: "moto bajaj", priorities: ["price", "proximity"], source_families: [],
      missing: ["année"], next_actions: [], confidence: 0.8, rationale: "",
    });
    expect(steps[0].text).toContain("80 %");
    expect(steps.find((step) => step.id === "criteria")?.chips).toEqual(["prix", "proximité"]);
    expect(steps.some((step) => step.id === "missing")).toBe(true);
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

describe("search reasoning wording", () => {
  it("reads the need without repeating the user's verb", async () => {
    const { reasonQuery, planSteps } = await import("../liveReasoning");
    expect(reasonQuery("Je cherche synelia")).toBe("synelia");
    expect(reasonQuery("je veux acheter un frigo.")).toBe("un frigo");
    expect(reasonQuery("Bonjour, j'ai besoin d'un plombier")).toBe("un plombier");
    expect(reasonQuery("un bic")).toBe("un bic");
    expect(planSteps({ query: "Je cherche synelia" })[0].text).toBe("Je cherche « synelia ».");
  });

  it("explains found offers, local ones and those Bot can reach", async () => {
    const { discoveryResultSteps } = await import("../liveReasoning");
    const offer = (id: string, city: string, price: number) => ({ fabric_id: id, city, price_min: price, subject: "Bic" }) as never;
    const steps = discoveryResultSteps([offer("article:a", "Abomey-Calavi", 150), offer("external:b", "Cotonou", 100)], { query: "un bic", city: "Abomey-Calavi" }, (r: { fabric_id: string }) => r.fabric_id.startsWith("article:"));
    expect(steps.map((s) => s.id)).toEqual(["res-found", "res-zone", "res-reach"]);
    expect(steps[0].text).toBe("2 offres trouvées.");
    expect(steps[1].text).toBe("1 offre à Abomey-Calavi.");
    expect(steps[2].text).toContain("1 vendeur joignable");
    expect(discoveryResultSteps([], { query: "x" })[0].tone).toBe("warn");
  });
});
