import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  centralSessionSummary,
  centralProviderOperational,
  centralWebhookConfig,
  isCentralWhatsAppPhone,
  isWahaInbound,
  whatsAppPhoneCandidates,
  wahaMessageId,
} from "./waouh-central-whatsapp.ts";
import {
  parseWhatsAppExchangeCommand,
  whatsAppExchangeSummary,
} from "./waouh-whatsapp-exchange.ts";
import { trustedWahaWebhook } from "./waouh-external-receipt.ts";
import { selectReplyJourney } from "./waouh-avatar-lifecycle.ts";

Deno.test("Central identity accepts the Benin 01 migration and rejects another connected number", () => {
  assertEquals(isCentralWhatsAppPhone("22965653468@c.us"), true);
  assertEquals(isCentralWhatsAppPhone("+229 01 65 65 34 68"), true);
  assertEquals(isCentralWhatsAppPhone("22965653469@c.us"), false);
});
Deno.test("Both inbound WAHA events are accepted, echoes/groups/broadcasts are excluded", () => {
  const payload = { from: "22965653469@c.us", fromMe: false };
  assertEquals(wahaMessageId({id:{_serialized:"message-1"}}),"message-1");
  assertEquals(wahaMessageId({id:"message-1"}),"message-1");
  for (const event of ["message", "message.any"]) {
    assertEquals(isWahaInbound(event, payload), true);
  }
  assertEquals(isWahaInbound("message", { ...payload, fromMe: true }), false);
  assertEquals(isWahaInbound("message.ack", payload), false);
  assertEquals(
    isWahaInbound("message", { ...payload, from: "123@g.us" }),
    false,
  );
});
Deno.test("Canonical webhook preserves unrelated configuration and is idempotent", () => {
  const previous = {
    proxy: "keep",
    webhooks: [{
      url: "https://project.supabase.co/functions/v1/waouh-channel-in",
      events: ["message"],
    }, { url: "https://other.example/hook", events: ["session.status"] }],
  };
  const config = centralWebhookConfig(
    previous,
    "https://project.supabase.co",
    "a".repeat(48),
  );
  assertEquals(config.proxy, "keep");
  assertEquals(config.webhooks.length, 2);
  assertEquals(
    centralWebhookConfig(config, "https://project.supabase.co", "a".repeat(48)),
    config,
  );
  assertThrows(() =>
    centralWebhookConfig(previous, "https://project.supabase.co", "")
  );
  assertEquals(
    centralSessionSummary({
      status: "WORKING",
      me: { id: "22965653468@c.us" },
      config,
    }).webhook_ready,
    true,
  );
  assertEquals(
    centralSessionSummary({
      status: "WORKING",
      me: { id: "22965653468@c.us" },
      config: previous,
    }).webhook_ready,
    false,
  );
  assertEquals(
    JSON.stringify(centralSessionSummary({ status: "WORKING", config }))
      .includes("a".repeat(48)),
    false,
  );
});
Deno.test("WhatsApp agreement commands require exact reference, full terms and explicit version", () => {
  assertEquals(parseWhatsAppExchangeCommand("oui"), null);
  assertEquals(
    parseWhatsAppExchangeCommand(
      "PROPOSER WA-AAAAAAAA 25000 FCFA | 1 | Cotonou | Après réception",
    )?.terms?.amount,
    25000,
  );
  assertThrows(() =>
    parseWhatsAppExchangeCommand("PROPOSER WA-AAAAAAAA 25000")
  );
  assertThrows(() => parseWhatsAppExchangeCommand("ACCEPTER WA-AAAAAAAA"));
  assertEquals(
    parseWhatsAppExchangeCommand("ACCEPTER WA-AAAAAAAA VERSION-BBBBBBBB")
      ?.version,
    "bbbbbbbb",
  );
  assertEquals(
    parseWhatsAppExchangeCommand("PAIEMENT RECU WA-AAAAAAAA VERSION-BBBBBBBB")
      ?.operation,
    "payment_received",
  );
  assertEquals(
    parseWhatsAppExchangeCommand("STOP WA-AAAAAAAA")?.operation,
    "stop",
  );
});
Deno.test("WhatsApp execution summaries expose the correct participant declarations", () => {
  const snapshot = {
    journey: {
      id: "aaaaaaaa-1111-4111-8111-111111111111",
      mode: "buy",
      stage: "agreed",
    },
    agreement: {
      id: "bbbbbbbb-1111-4111-8111-111111111111",
      terms: {
        amount: 25000,
        quantity: 1,
        delivery: "Cotonou",
        payment: "Après réception",
      },
    },
  };
  assertEquals(
    whatsAppExchangeSummary(snapshot, "owner").includes("RECU WA-AAAAAAAA"),
    true,
  );
  assertEquals(
    whatsAppExchangeSummary(snapshot, "owner").includes("EXPEDIE WA-AAAAAAAA"),
    false,
  );
  assertEquals(
    whatsAppExchangeSummary(snapshot, "counterparty").includes(
      "EXPEDIE WA-AAAAAAAA",
    ),
    true,
  );
  assertEquals(
    whatsAppExchangeSummary(snapshot, "counterparty").includes("aucun argent"),
    true,
  );
});
Deno.test("A read WhatsApp message remains eligible for exact journey association", () => {
  const row = {
    status: "read",
    payload: { journey_id: "aaaaaaaa-1111-4111-8111-111111111111" },
  };
  assertEquals(selectReplyJourney([row], "SUIVI WA-AAAAAAAA"), row);
});
Deno.test("Central webhook rejects missing/wrong tokens and accepts only the configured proof", async () => {
  const previous = Deno.env.get("WAHA_WEBHOOK_SECRET");
  Deno.env.set(
    "WAHA_WEBHOOK_SECRET",
    "verified-secret-value-48chars-00000000000000000000",
  );
  try {
    assertEquals(
      await trustedWahaWebhook(
        {},
        new Request("https://example.test/hook"),
        "WaouhApp",
      ),
      false,
    );
    assertEquals(
      await trustedWahaWebhook(
        {},
        new Request("https://example.test/hook", {
          headers: { "x-waouh-webhook-token": "wrong" },
        }),
        "WaouhApp",
      ),
      false,
    );
    assertEquals(
      await trustedWahaWebhook(
        {},
        new Request("https://example.test/hook", {
          headers: {
            "x-waouh-webhook-token": Deno.env.get("WAHA_WEBHOOK_SECRET")!,
          },
        }),
        "WaouhApp",
      ),
      true,
    );
  } finally {
    if (previous === undefined) Deno.env.delete("WAHA_WEBHOOK_SECRET");
    else Deno.env.set("WAHA_WEBHOOK_SECRET", previous);
  }
});

Deno.test("Phone association preserves international numbers and both Benin formats", () => {
  assertEquals(whatsAppPhoneCandidates("+229 01 65 65 34 68"), ["2290165653468", "22965653468"]);
  assertEquals(whatsAppPhoneCandidates("22965653468@c.us"), ["22965653468", "2290165653468"]);
  assertEquals(whatsAppPhoneCandidates("+33612345678"), ["33612345678"]);
  assertEquals(whatsAppPhoneCandidates("123456789012345678@lid"), []);
});

Deno.test("A WORKING WEBJS session with a broken injected client is unavailable for Avatar outreach", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"error":"Cannot read properties of undefined (reading getChat)"}', {status:500});
    assertEquals(await centralProviderOperational("https://provider.test","test",{status:"WORKING",engine:{engine:"WEBJS"},me:{id:"2290165653468@c.us"}}),false);
    globalThis.fetch = async () => new Response('[]', {status:200});
    assertEquals(await centralProviderOperational("https://provider.test","test",{status:"WORKING",engine:{engine:"WEBJS"},me:{id:"2290165653468@c.us"}}),true);
  } finally { globalThis.fetch = original; }
});
