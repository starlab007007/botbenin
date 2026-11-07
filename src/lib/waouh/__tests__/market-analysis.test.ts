import { describe, expect, it } from "vitest";
import { analyzeMarket } from "../marketAnalysis";
import { directChannels, directMessage, offerChannels } from "../offerChannels";

const item = (id: string, over: Record<string, unknown> = {}) => ({
  fabric_id: id, source_key: "x", intent: "SELL", subject: id, city: "Cotonou", price_min: 5000, price_max: 5000,
  scores: { total_score: 60, trust_score: 60, relevance_score: 60, intent_score: 0, price_score: 0, location_score: 0, freshness_score: 0, contactability_score: 0, reasons: [] },
  contact_policy: { level: "C0", can_reveal: false, can_auto_contact: false, requires_approval: false, label: "" },
  evidence: {}, ...over,
}) as never;

describe("canaux de contact", () => {
  it("détecte WAOUH, WhatsApp, e-mail et téléphone", () => {
    expect(offerChannels(item("article:1"))).toEqual(["waouh"]);
    expect(offerChannels(item("external:2", { evidence: { has_whatsapp: true, contact_hints: { email_count: 1 } } }))).toEqual(["whatsapp", "email"]);
    expect(offerChannels(item("external:3", { contact_pack: { available_channels: [{ channel: "phone" }, { channel: "whatsapp" }] } }))).toEqual(["whatsapp", "phone"]);
    expect(directChannels(item("article:1"))).toEqual([]);
  });
  it("une offre sans aucun contact n'a aucun canal", () => {
    expect(offerChannels(item("external:4", { price_min: 0, price_max: 0, evidence: { has_whatsapp: false, contact_hints: { email_count: 0, phone_count: 0 } } }))).toEqual([]);
  });
  it("rédige le premier message", () => {
    expect(directMessage("Samsung S25", 150000)).toContain("Samsung S25");
  });
});

describe("analyse du marché", () => {
  const offers = [
    item("article:a", { price_min: 100000, price_max: 100000 }),
    item("external:b", { price_min: 140000, price_max: 140000, evidence: { has_whatsapp: true } }),
    item("external:c", { price_min: 120000, price_max: 120000, evidence: { contact_hints: { email_count: 1 } } }),
    item("external:d", { price_min: 0, price_max: 0 }),
  ];
  it("calcule la fourchette, la médiane et les contacts", () => {
    const a = analyzeMarket(offers, { city: "Cotonou" });
    expect(a.low).toBe(100000); expect(a.high).toBe(140000); expect(a.median).toBe(120000);
    expect(a.total).toBe(4); expect(a.contactable).toBe(3); expect(a.inZone).toBe(4);
    expect(a.byChannel.waouh).toBe(1); expect(a.byChannel.whatsapp).toBe(1); expect(a.byChannel.email).toBe(1);
  });
  it("choisit une offre joignable, la moins chère à contact égal, et compare au plus 3 offres", () => {
    const a = analyzeMarket(offers, { city: "Cotonou" });
    expect(a.pick?.item.fabric_id).toBe("article:a");
    expect(a.pick?.reason).toContain("sous la médiane");
    expect(a.compare.length).toBeLessThanOrEqual(3);
    expect(a.compare.every((r) => r.channels.length > 0)).toBe(true);
  });
  it("n'invente aucun choix quand personne n'est joignable", () => {
    const a = analyzeMarket([item("external:z", { price_min: 0 })], {});
    expect(a.pick).toBeNull();
    expect(a.advice).toContain("contact");
  });
});
