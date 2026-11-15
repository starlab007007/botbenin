import { describe, expect, it } from "vitest";
import { briefDelegateId, chatMarketBrief } from "../chatMarketBrief";
import type { WaouhResultCard } from "@/components/waouh/WaouhProductCard";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const card = (index: number, over: Partial<WaouhResultCard> = {}): WaouhResultCard => ({ id: `r${index}`, index, title: `Offre ${index}`, ...over } as WaouhResultCard);

describe("analyse du marché dans la recherche du Chat", () => {
  it("calcule les repères à partir des seules offres reçues", () => {
    const brief = chatMarketBrief([
      card(1, { price: 300000, city: "Cotonou" }),
      card(2, { price: 200000, city: "Parakou" }),
      card(3, { price: 250000, city: "Cotonou" }),
      card(4, {}),
    ], { city: "Cotonou", budget: 260000 });
    expect(brief).toMatchObject({ total: 4, priced: 3, low: 200000, median: 250000, high: 300000, inZone: 2, overBudget: 1 });
    expect(brief.advice).toContain("200 000 F");
    expect(brief.advice).toContain("1 offre dépasse votre budget");
  });

  it("le choix de Bot respecte le budget et la zone, avec des raisons vérifiables", () => {
    const brief = chatMarketBrief([
      card(1, { price: 300000, city: "Cotonou", fabric_id: "external:x" }),
      card(2, { price: 240000, city: "Cotonou", fabric_id: `article:${A}`, photos: ["https://img/x.jpg"] }),
      card(3, { price: 180000, city: "Parakou" }),
    ], { city: "Cotonou", budget: 260000 });
    expect(brief.pick?.result.index).toBe(2);
    expect(brief.pick?.reasons.join(" ")).toContain("sous votre budget");
    expect(brief.pick?.reasons.join(" ")).toContain("Dans votre zone");
    expect(brief.compare.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("signale un prix anormalement bas au lieu de le présenter comme un avantage", () => {
    const brief = chatMarketBrief([card(1, { price: 20000 }), card(2, { price: 300000 }), card(3, { price: 310000 }), card(4, { price: 320000 })]);
    const low = brief.compare.find((r) => r.result.index === 1);
    expect(brief.pick?.result.index).not.toBe(1);
    expect(low === undefined || low.rank > 1).toBe(true);
  });

  it("ne confie à Bot que des offres identifiées, dans le budget, jamais une demande d’acheteur", () => {
    expect(briefDelegateId(card(1, { fabric_id: "external:abc" }))).toBe("external:abc");
    expect(briefDelegateId(card(1, { id: A, source: "waouh" }))).toBe(`article:${A}`);
    expect(briefDelegateId(card(1, { id: B, source: "partner" }))).toBe(`catalog:${B}`);
    expect(briefDelegateId(card(1, { id: "result-1", source: "waouh" }))).toBeNull();
    expect(briefDelegateId(card(1, { id: A, source: "radar" }))).toBeNull();
    expect(briefDelegateId(card(1, { fabric_id: "external:abc", intent: "BUY" }))).toBeNull();
    const brief = chatMarketBrief([
      card(1, { price: 500000, fabric_id: "external:cher" }),
      card(2, { price: 200000, fabric_id: "external:ok" }),
      card(3, { price: 210000 }),
    ], { budget: 250000 });
    expect(brief.delegable.map((r) => r.delegateId)).toEqual(["external:ok"]);
  });

  it("sans prix annoncé, le dit clairement", () => {
    const brief = chatMarketBrief([card(1), card(2)]);
    expect(brief.low).toBeNull();
    expect(brief.advice).toContain("Aucun prix");
    expect(brief.pick?.reasons.length).toBeGreaterThan(0);
  });
});

describe("pertinence : la demande d'abord", () => {
  it("place le modèle demandé avant un modèle proche, même moins cher", async () => {
    const { briefMatch } = await import("../chatMarketBrief");
    const results = [
      card(1, { title: "iPhone 11", price: 90000, city: "Cotonou", photos: ["https://x.bj/a.jpg"] }),
      card(2, { title: "iPhone 6 à 25000", price: 25000 }),
      card(3, { title: "Apple iPhone 13 128 Go", price: 210000 }),
      card(4, { title: "iphone 13 pro", price: 260000 }),
    ];
    expect(briefMatch(results[0], "iPhone 13")).toBe("near");
    expect(briefMatch(results[2], "Je cherche un iPhone 13")).toBe("exact");
    const brief = chatMarketBrief(results, { query: "iPhone 13" });
    expect(brief.pick?.result.title).toBe("Apple iPhone 13 128 Go");
    expect(brief.pick?.reasons[0]).toBe("Correspond à votre demande");
    expect(brief.exact).toBe(2);
    // Les repères de prix portent sur le modèle demandé.
    expect(brief.low).toBe(210000);
  });
  it("dit clairement quand seules des offres proches existent", () => {
    const brief = chatMarketBrief([card(1, { title: "iPhone 11", price: 90000 }), card(2, { title: "iPhone 6", price: 25000 })], { query: "iPhone 13" });
    expect(brief.exact).toBe(0);
    expect(brief.advice).toMatch(/^Aucune offre ne correspond exactement/);
    expect(brief.pick?.reasons).toContain("Modèle proche de votre demande");
  });
  it("sans demande exploitable, rien ne change", () => {
    expect(chatMarketBrief([card(1, { price: 10 })], {}).exact).toBeNull();
  });
});
