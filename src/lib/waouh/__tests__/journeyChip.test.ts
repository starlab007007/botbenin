import { describe, expect, it } from "vitest";
import { journeyChip } from "../journeyChip";
const now = Date.parse("2026-11-26T12:00:00Z");
describe("journeyChip", () => {
  it("annonce les jours restants d'une opportunité", () => expect(journeyChip({ evidence: { deadline: "2026-12-01T12:00:00Z" } }, "opportunity", now)?.label).toBe("5 jours restants"));
  it("marque une opportunité close", () => expect(journeyChip({ expires_at: "2026-11-20T00:00:00Z" }, "opportunity", now)?.label).toBe("Clôturé"));
  it("signale une offre d'une ville proche", () => expect(journeyChip({ nearby: true, city: "Cotonou" }, "purchase", now)?.label).toBe("Ville proche · Cotonou"));
  it("dit si un prestataire est joignable", () => expect(journeyChip({ contact_policy: { level: "C1" } }, "service", now)?.label).toBe("Joignable"));
  it("donne l'âge d'une demande d'achat", () => expect(journeyChip({ observed_at: "2026-11-24T12:00:00Z" }, "sale", now)?.label).toBe("Demande d'il y a 2 j"));
});
