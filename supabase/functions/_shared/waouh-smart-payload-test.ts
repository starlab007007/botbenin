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
