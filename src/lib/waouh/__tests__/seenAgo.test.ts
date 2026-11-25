import { describe, it, expect } from "vitest";
import { seenAgo, sourceLabel } from "../seenAgo";
const now = Date.parse("2026-11-26T12:00:00Z");
describe("seenAgo", () => {
  it("2 h", () => expect(seenAgo("2026-11-26T10:00:00Z", now)).toBe("Vu il y a 2 h"));
  it("3 jours", () => expect(seenAgo("2026-11-23T12:00:00Z", now)).toBe("Vu il y a 3 j"));
  it("sans date", () => expect(seenAgo(null, now)).toBe("Date non précisée"));
  it("provenance CoinAfrique", () => expect(sourceLabel("https://bj.coinafrique.com/annonce/1")).toBe("CoinAfrique"));
  it("sans lien = WAOUH", () => expect(sourceLabel(null)).toBe("WAOUH"));
});
