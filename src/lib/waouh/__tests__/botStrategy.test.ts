import { describe, it, expect } from "vitest";
import { botTrack, suggestMandate, mandateSummary, botLine } from "../botStrategy";

describe("Bot strategy", () => {
  it("maps journeys to tracks", () => {
    expect(botTrack("sell")).toBe("sell");
    expect(botTrack("buy", "service")).toBe("service");
    expect(botTrack("buy", "project")).toBe("job");
    expect(botTrack("buy", "opportunity")).toBe("opportunity");
    expect(botTrack("ask")).toBe("find");
    expect(botTrack("buy", "purchase")).toBe("buy");
  });
  it("buy ceiling uses typed budget first", () => {
    expect(suggestMandate({ track: "buy", price: 50000, marketMedian: 40000, budgetMax: 45000 }).limit).toBe(45000);
  });
  it("buy ceiling falls back to lower of price and market median", () => {
    expect(suggestMandate({ track: "buy", price: 50000, marketMedian: 40000 }).limit).toBe(40000);
  });
  it("seller must explicitly authorize a private floor", () => {
    expect(suggestMandate({ track: "sell", price: 100000 }).limit).toBeNull();
  });
  it("2 follow-ups max, seven-day default for commercial cascades", () => {
    expect(suggestMandate({ track: "buy", price: 1 })).toMatchObject({ maxFollowups: 2, durationHours: 168 });
    expect(suggestMandate({ track: "service" }).durationHours).toBe(168);
    expect(suggestMandate({ track: "opportunity" }).limit).toBeNull();
  });
  it("summary states the bound", () => {
    expect(mandateSummary({ track: "sell", limit: 90000, durationHours: 24, maxFollowups: 2 })).toContain("jamais sous 90 000 FCFA");
  });
  it("Bot line asks user to validate a proposed agreement", () => {
    expect(botLine({ control_mode: "bot", agreement: { status: "proposed" }, events: [{ event_type: "propose", created_at: "x" }] })).toMatchObject({ last: "Proposition envoyée", next: "Votre confirmation est attendue" });
  });
});
