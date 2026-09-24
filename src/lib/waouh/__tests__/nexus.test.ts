import { describe, expect, it } from "vitest";
import { nexusBadgeLabel, nexusScoreLabel, nexusSourceLabel } from "../nexus";

describe("WAOUH NEXUS UI helpers", () => {
  it("présente les sources dans un vocabulaire simple", () => {
    expect(nexusSourceLabel("radar_ia")).toBe("Radar IA");
    expect(nexusSourceLabel("partner")).toBe("Partenaire");
    expect(nexusSourceLabel("whatsapp")).toBe("WhatsApp");
  });

  it("transforme un score en conseil lisible", () => {
    expect(nexusScoreLabel(91)).toBe("Excellent match");
    expect(nexusScoreLabel(74)).toBe("Très compatible");
    expect(nexusScoreLabel(58)).toBe("Compatible");
  });

  it("traduit les badges de décision", () => {
    expect(nexusBadgeLabel("recommended")).toBe("Recommandé");
    expect(nexusBadgeLabel("cheapest")).toBe("Moins cher");
  });
});
