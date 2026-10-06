import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildWaouhSmartEnvelope, enrichWaouhSmartPayload } from "./waouh-smart-payload.ts";

Deno.test("smart payload: commerce keeps authoritative actions and best action", () => {
  const smart = buildWaouhSmartEnvelope({
    intent: "offer_received",
    threadId: "thread-demo",
    correlationId: "corr-demo",
    actions: [
      { id: "accept:demo", label: "Accepter" },
      { id: "counter:demo", label: "Contre-proposer" },
    ],
  });
  assertEquals(smart.schema, "waouh.smart.v1");
  assertEquals(smart.domain, "commerce");
  assertEquals(smart.route, "/app/chat/waouh");
  assertEquals(smart.correlation_id, "corr-demo");
  assertEquals(smart.actions[0].kind, "commerce");
  assertEquals(smart.next_best_action, "accept:demo");
  assertEquals(smart.prediction.confidence, 0.96);
});

Deno.test("smart payload: stock without actions gets safe navigation fallback", () => {
  const payload = enrichWaouhSmartPayload({}, {
    intent: "low_stock",
    stockItemId: "stock-demo",
  });
  const smart = payload.smart as Record<string, any>;
  assertEquals(payload.target_route, "/app/stock");
  assertEquals(payload.next_best_action, "open_context");
  assertEquals(smart.domain, "stock");
  assertEquals(smart.actions[0].route, "/app/stock");
  assertEquals(smart.actions[0].requires_confirmation, false);
});

Deno.test("smart payload: diffusion, partner, missions and whatsapp route to their surfaces", () => {
  const fixtures = [
    ["diffusion_campaign_ready", "/app/diffusion"],
    ["partner_catalog_update", "/app/partner"],
    ["avatar_nudge_due", "/app/missions"],
    ["whatsapp_message_received", "/app/whatsapp"],
  ] as const;
  for (const [intent, route] of fixtures) {
    const smart = buildWaouhSmartEnvelope({ intent });
    assertEquals(smart.route, route);
  }
});


Deno.test("smart payload: workflow recommendation overrides array order", () => {
  const payload = enrichWaouhSmartPayload({
    actions: [
      { id: "counter:demo", label: "Contre-proposer" },
      { id: "accept:demo", label: "Accepter" },
    ],
    suggest: { best_action: "accept:demo" },
  }, {
    intent: "offer_received",
    correlationId: "corr-predictive",
  });
  const smart = payload.smart as Record<string, any>;
  assertEquals(smart.next_best_action, "accept:demo");
  assertEquals(smart.prediction.reason, "workflow_prediction");
  assertEquals(smart.prediction.confidence, 0.99);
  assertEquals(smart.actions[0].requires_auth, true);
});


Deno.test("smart payload: contextual commerce actions stay safe outside the thread", () => {
  const smart = buildWaouhSmartEnvelope({
    intent: "offer_received",
    negotiationId: "11111111-1111-4111-8111-111111111111",
  });
  assertEquals(smart.actions.map((a) => a.id), [
    "open_context",
    "accepter:11111111-1111-4111-8111-111111111111",
    "contre-proposition:11111111-1111-4111-8111-111111111111",
    "refuser:11111111-1111-4111-8111-111111111111",
  ]);
  assertEquals(smart.next_best_action, "open_context");
  assertEquals(smart.prediction.reason, "workflow_context");
  assertEquals(smart.actions[1].kind, "commerce");
  assertEquals(smart.actions[1].requires_confirmation, true);
});

Deno.test("smart payload: accepted deal adapts actions to recipient role", () => {
  const seller = buildWaouhSmartEnvelope({
    intent: "deal_accepted",
    dealId: "22222222-2222-4222-8222-222222222222",
    recipientRole: "seller",
  });
  assertEquals(seller.actions[1].id, "confirmer-disponibilite:22222222-2222-4222-8222-222222222222");

  const buyer = buildWaouhSmartEnvelope({
    intent: "deal_accepted",
    dealId: "22222222-2222-4222-8222-222222222222",
    recipientRole: "buyer",
  });
  assertEquals(buyer.actions[1].id, "payer-mobile:22222222-2222-4222-8222-222222222222");
  assertEquals(buyer.actions[2].id, "paiement-livraison:22222222-2222-4222-8222-222222222222");
});

Deno.test("smart payload: operational domains expose a domain-specific CTA", () => {
  const fixtures = [
    ["wa_inbound", "Répondre sur WhatsApp"],
    ["diffusion_campaign_ready", "Suivre la diffusion"],
    ["partner_catalog_update", "Gérer l'espace partenaire"],
    ["low_stock", "Réapprovisionner"],
    ["avatar_nudge_due", "Continuer la mission"],
  ] as const;
  for (const [intent, label] of fixtures) {
    const smart = buildWaouhSmartEnvelope({ intent });
    assertEquals(smart.actions[0].label, label);
    assertEquals(smart.actions[0].requires_auth, true);
  }
});
