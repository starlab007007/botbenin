import { describe, it, expect } from "vitest";
import { fabricQuality } from "../../../../supabase/functions/_shared/waouh-fabric-quality";
const now = Date.parse("2026-11-26T00:00:00Z");
const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
const base = { subject: "Bic", city: "Cotonou", price_min: 500, observed_at: ago(1) };
describe("fabricQuality", () => {
  it("fiche complète et récente : pas de pénalité", () => expect(fabricQuality(base, true, now).factor).toBe(1));
  it("produit de 31 jours : déclassé", () => expect(fabricQuality({ ...base, observed_at: ago(31) }, true, now).factor).toBe(0.7));
  it("produit de 61 jours : masqué", () => expect(fabricQuality({ ...base, observed_at: ago(61) }, true, now).hidden).toBe(true));
  it("opportunité de 61 jours : pas masquée", () => expect(fabricQuality({ ...base, observed_at: ago(61) }, false, now).hidden).toBe(false));
  it("sans prix ni contact : incomplète", () => expect(fabricQuality({ ...base, price_min: null }, true, now).complete).toBe(false));
  it("sans prix mais contact joignable : complète", () => expect(fabricQuality({ ...base, price_min: null, contactability_level: "C3" }, true, now).complete).toBe(true));
  it("sans ville : incomplète", () => expect(fabricQuality({ ...base, city: "" }, true, now).complete).toBe(false));
});
