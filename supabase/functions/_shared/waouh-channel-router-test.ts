import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { routeOpportunityChannel } from "./waouh-channel-router.ts";

Deno.test("Channel Router: internal WAOUH is canonical", () => {
  const route = routeOpportunityChannel({
    internal: true,
    contactability: "C2",
    channels: [{ channel: "waouh", verified: true, reachable: true }],
  });
  assertEquals(route.primary_channel, "waouh");
  assertEquals(route.can_dispatch, true);
  assertEquals(route.mode, "integrated");
});

Deno.test("Channel Router: C1 business WhatsApp becomes usable under mandate", () => {
  const route = routeOpportunityChannel({
    contactability: "C1",
    allowWhatsapp: true,
    allowPublicBusiness: true,
    channels: [{
      channel: "whatsapp",
      verified: true,
      reachable: true,
      public_business: true,
      consent_state: "public_business",
    }],
  });
  assertEquals(route.primary_channel, "whatsapp");
  assertEquals(route.can_dispatch, true);
});

Deno.test("Channel Router: C1 business phone uses WhatsApp preflight", () => {
  const route = routeOpportunityChannel({
    contactability: "C1",
    channels: [{
      channel: "phone",
      verified: true,
      reachable: null,
      public_business: true,
      consent_state: "public_business",
    }],
    allowWhatsapp: true,
    allowPublicBusiness: true,
  });
  assertEquals(route.primary_channel, "phone");
  assertEquals(route.can_dispatch, true);
  assertEquals(route.reason, "public_business_phone_with_whatsapp_preflight");
});

Deno.test("Channel Router: C1 private phone is not auto-contacted", () => {
  const route = routeOpportunityChannel({
    contactability: "C1",
    channels: [{ channel: "phone", verified: true, public_business: false }],
    allowPublicBusiness: true,
  });
  assertEquals(route.can_dispatch, false);
});

Deno.test("Channel Router: email is a declared fallback but not fake-dispatched", () => {
  const route = routeOpportunityChannel({
    contactability: "C3",
    channels: [{ channel: "email", verified: true }],
    allowEmail: true,
  });
  assertEquals(route.primary_channel, "email");
  assertEquals(route.can_dispatch, false);
  assertEquals(route.reason, "provider_not_yet_bound");
});

Deno.test("Channel Router: C0 always enriches", () => {
  const route = routeOpportunityChannel({
    contactability: "C0",
    channels: [{ channel: "whatsapp", verified: true, reachable: true }],
  });
  assertEquals(route.primary_channel, null);
  assertEquals(route.reason, "enrichment_required");
});
