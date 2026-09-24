import {
  contactabilityPolicy,
  extractPublicContactHints,
  fabricTokens,
  oppositeIntent,
  scoreFabricSignal,
} from "./waouh-signal-fabric.ts";

Deno.test("Signal Fabric: seller discovery ranks relevant SELL signal", () => {
  const score = scoreFabricSignal({
    query: "Samsung S25 256 Go",
    mode: "find_sellers",
    city: "Cotonou",
    budgetMax: 400000,
    signal: {
      intent: "SELL",
      subject: "Samsung Galaxy S25 256GB neuf",
      city: "Cotonou",
      price_min: 385000,
      trust_score: 90,
      contactability_level: "C1",
      observed_at: new Date().toISOString(),
    },
  });
  if (score.total_score < 70) throw new Error(`score too low: ${score.total_score}`);
});

Deno.test("Signal Fabric: buyer discovery requires BUY direction", () => {
  if (oppositeIntent("find_buyers") !== "BUY") throw new Error("wrong buyer intent");
  const score = scoreFabricSignal({
    query: "10 tonnes soja",
    mode: "find_buyers",
    signal: { intent: "BUY", subject: "cherche fournisseur soja 10 tonnes", trust_score: 80, contactability_level: "C3" },
  });
  if (score.intent_score !== 100) throw new Error("BUY intent not recognized");
});

Deno.test("Signal Fabric: contactability enforces discovery boundary", () => {
  if (contactabilityPolicy("C0").can_reveal) throw new Error("C0 contact leaked");
  if (contactabilityPolicy("C1").can_auto_contact) throw new Error("C1 auto outreach must be blocked");
  if (contactabilityPolicy("C2").can_reveal) throw new Error("C2 private contact must not be revealed outside its conversation");
  if (!contactabilityPolicy("C3").requires_approval) throw new Error("C3 should require approval");
  if (!contactabilityPolicy("C4").can_auto_contact) throw new Error("C4 agent-to-agent should be allowed");
});

Deno.test("Signal Fabric: extracts voluntarily shared public contact hints", () => {
  const hints = extractPublicContactHints("Tel +229 01 97 11 22 33, contact vente@example.bj https://shop.example.bj/p/1");
  if (!hints.phones.length || hints.emails[0] !== "vente@example.bj" || !hints.urls.length) throw new Error("hints extraction failed");
});

Deno.test("Signal Fabric: stop words do not dominate matching", () => {
  const tokens = fabricTokens("Je cherche un vendeur de climatiseur LG inverter");
  if (!tokens.includes("climatiseur") || tokens.includes("cherche")) throw new Error("token normalization failed");
});
