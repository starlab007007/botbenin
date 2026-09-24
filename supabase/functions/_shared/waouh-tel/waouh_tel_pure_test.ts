import { parseInboundEvents } from "./canonical-event.ts";
import { parseTelCommand } from "./commands.ts";
import { normalizeE164 } from "./phone.ts";
import {
  nativeEngineRequestAuthorized,
  requiresNativeEngineAuthorization,
} from "./native-engine-auth.ts";
import {
  nextMessageStatus,
  receiptOccurredAt,
  receiptOutboxLookup,
  receiptProviderStatus,
  receiptStatus,
} from "./receipt-status.ts";
import {
  chooseOutboundChannel,
  infobipRcsEventRequest,
  infobipRcsRequest,
} from "./provider.ts";
import {
  ensureSmsPayload,
  renderSmsFromEngine,
  segmentSms,
} from "./render-sms.ts";
import type {
  TelOutboundPayload,
  TelSettings,
  WaouhEngineReply,
} from "./types.ts";

function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (Object.is(actual, expected)) return;
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      message || `Expected ${expectedJson}, received ${actualJson}`,
    );
  }
}

function gsmSeptets(value: string) {
  const extended = new Set([..."^{}\\[~]|€"]);
  return [...value].reduce(
    (total, character) => total + (extended.has(character) ? 2 : 1),
    0,
  );
}

const settings: TelSettings = {
  key: "default",
  enabled: true,
  provider: "infobip",
  business_phone_e164: "+2290140000000",
  business_phone_display: "+229 01 40 00 00 00",
  rcs_sender_name: "WAOUH",
  default_country_code: "+229",
  sms_enabled: true,
  rcs_enabled: true,
  fallback_to_sms: true,
  virtual_groups_enabled: true,
  native_groups_enabled: false,
  public_base_url: "https://bot.bj",
  default_locale: "fr-BJ",
  terms_version: "2026-09",
  help_text: "Aide WAOUH",
};

Deno.test("normalizeE164 canonicalise les numéros béninois anciens et nouveaux", () => {
  assertEquals(normalizeE164("97 12 34 56"), "+2290197123456");
  assertEquals(normalizeE164("01 97 12 34 56"), "+2290197123456");
  assertEquals(normalizeE164("+229 97 12 34 56"), "+2290197123456");
  assertEquals(normalizeE164("00229 01 97 12 34 56"), "+2290197123456");
  assertEquals(normalizeE164("+2290197123456"), "+2290197123456");
});

Deno.test("l'auth moteur protège uniquement les sessions Native Messaging", () => {
  const secret = "internal-secret-long-enough-123";
  const nativePayload = {
    source: "native_messaging",
    channel: "native_messaging",
    web_session_id: "tel:123e4567-e89b-42d3-a456-426614174000",
    phone_number: "web:tel:123e4567-e89b-42d3-a456-426614174000",
  };
  assert(requiresNativeEngineAuthorization(nativePayload));
  assert(nativeEngineRequestAuthorized(
    nativePayload,
    `Bearer ${secret}`,
    secret,
  ));
  assertEquals(
    nativeEngineRequestAuthorized(nativePayload, "Bearer incorrect", secret),
    false,
  );
  assertEquals(
    nativeEngineRequestAuthorized(
      { ...nativePayload, user_id: "forged" },
      `Bearer ${secret}`,
      secret,
    ),
    false,
  );
  assertEquals(requiresNativeEngineAuthorization({ channel: "web" }), false);
  assert(nativeEngineRequestAuthorized({ channel: "web" }, "", ""));
});

Deno.test("normalizeE164 conserve les numéros internationaux valides et rejette les entrées invalides", () => {
  assertEquals(normalizeE164("+33 6 12 34 56 78"), "+33612345678");
  assertEquals(normalizeE164("0044 7700 900123"), "+447700900123");
  assertEquals(normalizeE164("612345678", "+33"), "+33612345678");
  assertEquals(normalizeE164("+1 (202) 555-0198"), "+12025550198");
  assertEquals(normalizeE164("WAOUH 97 12 34 56"), null);
  assertEquals(normalizeE164("123"), null);
  assertEquals(normalizeE164(""), null);
});

Deno.test("parseInboundEvents normalise un webhook SMS Infobip", async () => {
  const result = await parseInboundEvents({
    results: [{
      messageId: "sms-message-1",
      callbackData: "sms-event-1",
      from: "22997123456",
      to: "2290140000000",
      receivedAt: "2026-09-24T07:00:00.000Z",
      text: "Je cherche une moto",
    }],
  }, { provider: "infobip", defaultCountryCode: "+229" });

  assertEquals(result.rejected, []);
  assertEquals(result.events.length, 1);
  assertEquals(result.events[0].provider_event_id, "sms-event-1");
  assertEquals(result.events[0].provider_message_id, "sms-message-1");
  assertEquals(result.events[0].channel, "sms");
  assertEquals(result.events[0].sender, "+2290197123456");
  assertEquals(result.events[0].recipient, "+2290140000000");
  assertEquals(result.events[0].type, "text");
  assertEquals(result.events[0].text, "Je cherche une moto");
  assertEquals(result.events[0].occurred_at, "2026-09-24T07:00:00.000Z");
});

Deno.test("parseInboundEvents normalise un message riche RCS Infobip", async () => {
  const result = await parseInboundEvents({
    messages: [{
      id: "rcs-event-1",
      messageId: "rcs-message-1",
      channel: "RCS",
      from: "+2290197123456",
      to: "+2290140000000",
      sentAt: "2026-09-24T07:01:00Z",
      conversation: { id: "conversation-rcs-1" },
      content: {
        body: {
          text: "Montre-moi cette maison",
          url: "https://cdn.bot.bj/maison.jpg",
          mimeType: "image/jpeg",
        },
      },
    }],
  }, { provider: "infobip", defaultCountryCode: "+229" });

  assertEquals(result.rejected, []);
  assertEquals(result.events.length, 1);
  assertEquals(result.events[0].channel, "rcs");
  assertEquals(result.events[0].external_thread_id, "conversation-rcs-1");
  assertEquals(result.events[0].type, "image");
  assertEquals(result.events[0].text, "Montre-moi cette maison");
  assertEquals(result.events[0].attachments, [{
    url: "https://cdn.bot.bj/maison.jpg",
    mime_type: "image/jpeg",
  }]);
});

Deno.test("parseInboundEvents reconnaît le contrat INBOUND_MESSAGE RCS officiel Infobip", async () => {
  const result = await parseInboundEvents({
    results: [{
      sender: "2290197123456",
      to: "WAOUH",
      integrationType: "RCS",
      receivedAt: "2026-09-24T07:02:00.000+0000",
      message: {
        id: "rcs-official-message-1",
        type: "TEXT",
        text: "Trouve-moi un téléphone",
      },
    }],
  }, { provider: "infobip", defaultCountryCode: "+229" });

  assertEquals(result.rejected, []);
  assertEquals(result.events.length, 1);
  assertEquals(result.events[0].channel, "rcs");
  assertEquals(result.events[0].provider_message_id, "rcs-official-message-1");
  assertEquals(result.events[0].recipient, null);
  assertEquals(result.events[0].recipient_raw, "WAOUH");
  assertEquals(result.events[0].text, "Trouve-moi un téléphone");
});

Deno.test("parseInboundEvents utilise le postback d'une suggestion RCS Infobip", async () => {
  const result = await parseInboundEvents({
    results: [{
      sender: "2290197123456",
      to: "WAOUH",
      integrationType: "RCS",
      messageId: "rcs-suggestion-1",
      receivedAt: "2026-09-24T07:03:00.000+0000",
      message: {
        type: "SUGGESTION",
        text: "Choisir 1",
        postbackData: "1",
      },
    }],
  }, { provider: "infobip", defaultCountryCode: "+229" });

  assertEquals(result.rejected, []);
  assertEquals(result.events.length, 1);
  assertEquals(result.events[0].channel, "rcs");
  assertEquals(result.events[0].type, "suggestion");
  assertEquals(result.events[0].text, "1");
});

Deno.test("parseInboundEvents ignore explicitement un indicateur de saisie RCS", async () => {
  const result = await parseInboundEvents({
    results: [{
      sender: "2290197123456",
      to: "WAOUH",
      integrationType: "RCS",
      event: { type: "TYPING_INDICATOR" },
    }],
  }, { provider: "infobip", defaultCountryCode: "+229" });

  assertEquals(result.events, []);
  assertEquals(result.rejected, [{
    reason: "ignored_typing_indicator",
    index: 0,
  }]);
});

Deno.test("parseInboundEvents rejette les expéditeurs invalides et les messages vides", async () => {
  const result = await parseInboundEvents({
    results: [
      { messageId: "bad-sender", from: "inconnu", text: "Bonjour" },
      { messageId: "empty", from: "+2290197123456" },
    ],
  }, { provider: "infobip", defaultCountryCode: "+229" });

  assertEquals(result.events, []);
  assertEquals(result.rejected, [
    { reason: "invalid_sender", index: 0 },
    { reason: "empty_message", index: 1 },
  ]);
});

Deno.test("renderSmsFromEngine rend les produits, choix et photos en texte lisible", () => {
  const reply: WaouhEngineReply = {
    schema: "waouh.message.v1",
    text: "Voici deux options.",
    products: [
      {
        id: "moto-1",
        title: "Bajaj Boxer",
        price: 450000,
        currency: "XOF",
        city: "Cotonou",
        photos: ["https://cdn.bot.bj/moto-1.jpg"],
      },
      {
        id: "moto-2",
        title: "TVS HLX",
        price: null,
        image_url: "https://cdn.bot.bj/moto-2.jpg",
      },
    ],
    actions: [{ id: "more", label: "Voir plus", value: "PLUS" }],
    attachments: [{
      url: "https://cdn.bot.bj/fiche.pdf",
      mime_type: "application/pdf",
    }],
  };

  const payload = renderSmsFromEngine(reply);
  assertEquals(payload.schema, "waouh.tel.outbound.v1");
  assert(payload.text.startsWith("Voici deux options."));
  assert(payload.text.includes("1. Bajaj Boxer"));
  assert(payload.text.includes("450"));
  assert(payload.text.includes("F CFA — Cotonou"));
  assert(payload.text.includes("2. TVS HLX — Prix à discuter"));
  assert(payload.text.includes("Répondez avec le numéro de votre choix."));
  assert(payload.text.includes("https://cdn.bot.bj/moto-1.jpg"));
  assert(payload.text.includes("https://cdn.bot.bj/moto-2.jpg"));
  assert(payload.text.includes("https://cdn.bot.bj/fiche.pdf"));
  assertEquals(payload.metadata, { rendered_for: "sms" });
});

Deno.test("segmentSms respecte la capacité GSM multipart, préfixe inclus", () => {
  const segments = segmentSms(`${"A".repeat(155)} {WAOUH} ${"B".repeat(155)}`);
  assert(segments.length >= 2);
  segments.forEach((segment, index) => {
    assert(segment.startsWith(`(${index + 1}/${segments.length}) `));
    assert(
      gsmSeptets(segment) <= 153,
      `Segment GSM ${index + 1} trop long: ${gsmSeptets(segment)} septets`,
    );
  });
  assertEquals(
    segments.map((segment) => segment.replace(/^\(\d+\/\d+\) /, "")).join("")
      .replace(/\s+/g, ""),
    `${"A".repeat(155)} {WAOUH} ${"B".repeat(155)}`.replace(/\s+/g, ""),
  );
});

Deno.test("segmentSms respecte la capacité Unicode multipart, préfixe inclus", () => {
  const original = "🙂".repeat(120);
  const segments = segmentSms(original);
  assert(segments.length >= 2);
  segments.forEach((segment, index) => {
    assert(segment.startsWith(`(${index + 1}/${segments.length}) `));
    assert(
      [...segment].length <= 67,
      `Segment Unicode ${index + 1} trop long: ${
        [...segment].length
      } caractères`,
    );
  });
  assertEquals(
    segments.map((segment) => segment.replace(/^\(\d+\/\d+\) /, "")).join(""),
    original,
  );
});

Deno.test("infobipRcsRequest produit une CARD avec image et suggestions", () => {
  const payload: TelOutboundPayload = {
    schema: "waouh.tel.outbound.v1",
    text: "Cette moto correspond à votre recherche.",
    products: [{
      id: "moto-1",
      title: "Bajaj Boxer",
      price: 450000,
      currency: "XOF",
      photos: ["https://cdn.bot.bj/moto.jpg"],
      source_url: "https://bot.bj/annonce/moto-1",
    }],
    actions: [
      { id: "details", label: "Détails", value: "DETAILS" },
      {
        id: "open",
        label: "Ouvrir",
        value: "OPEN",
        url: "https://bot.bj/annonce/moto-1",
      },
    ],
  };

  const request: any = infobipRcsRequest(
    settings,
    "+2290197123456",
    payload,
    "outbox-1",
  );
  const message = request.messages[0];
  assertEquals(message.sender, "WAOUH");
  assertEquals(message.destinations, [{ to: "2290197123456" }]);
  assertEquals(message.callbackData, "outbox-1");
  assertEquals(message.content.type, "CARD");
  assertEquals(message.content.orientation, "VERTICAL");
  assertEquals(
    message.content.content.media.file.url,
    "https://cdn.bot.bj/moto.jpg",
  );
  assertEquals(message.content.content.suggestions, [
    { type: "REPLY", text: "Détails", postbackData: "DETAILS" },
    {
      type: "OPEN_URL",
      text: "Ouvrir",
      url: "https://bot.bj/annonce/moto-1",
      postbackData: "OPEN",
    },
  ]);
});

Deno.test("infobipRcsRequest produit un CAROUSEL et borne les suggestions", () => {
  const payload: TelOutboundPayload = {
    schema: "waouh.tel.outbound.v1",
    text: "Choisissez une annonce.",
    products: [
      {
        id: "1",
        title: "Maison Fidjrossè",
        price: 25000000,
        photos: ["https://cdn.bot.bj/1.jpg"],
      },
      {
        id: "2",
        title: "Maison Calavi",
        price: 18000000,
        image_url: "https://cdn.bot.bj/2.jpg",
      },
    ],
    actions: Array.from({ length: 5 }, (_, index) => ({
      id: `action-${index + 1}`,
      label: `Action ${index + 1}`,
      value: `ACTION_${index + 1}`,
    })),
  };

  const request: any = infobipRcsRequest(
    settings,
    "+2290197123456",
    payload,
    "outbox-2",
  );
  const content = request.messages[0].content;
  assertEquals(content.type, "CAROUSEL");
  assertEquals(content.cardWidth, "MEDIUM");
  assertEquals(content.contents.length, 2);
  assertEquals(content.contents[0].media.file.url, "https://cdn.bot.bj/1.jpg");
  assertEquals(content.contents[1].media.file.url, "https://cdn.bot.bj/2.jpg");
  assertEquals(content.suggestions.length, 3);
  assertEquals(content.suggestions[0], {
    type: "REPLY",
    text: "Action 1",
    postbackData: "ACTION_1",
  });
});

Deno.test("infobipRcsEventRequest produit les événements SEEN et TYPING_INDICATOR", () => {
  assertEquals(
    infobipRcsEventRequest(
      settings,
      "+2290197123456",
      "inbound-rcs-message-42",
    ),
    {
      events: [
        {
          sender: "WAOUH",
          destinations: [{ to: "2290197123456" }],
          content: { messageId: "inbound-rcs-message-42", type: "SEEN" },
        },
        {
          sender: "WAOUH",
          destinations: [{ to: "2290197123456" }],
          content: { type: "TYPING_INDICATOR" },
        },
      ],
    },
  );
});

Deno.test("segmentSms plafonne les très longs textes GSM et Unicode à dix segments valides", () => {
  const cases = [
    { kind: "GSM", segments: segmentSms("A".repeat(4_000)), limit: 153 },
    { kind: "Unicode", segments: segmentSms("🙂".repeat(1_500)), limit: 67 },
  ];

  for (const { kind, segments, limit } of cases) {
    assertEquals(segments.length, 10, `${kind}: dix segments attendus`);
    segments.forEach((segment, index) => {
      assert(
        segment.startsWith(`(${index + 1}/10) `),
        `${kind}: préfixe incorrect au segment ${index + 1}`,
      );
      const length = kind === "GSM" ? gsmSeptets(segment) : [...segment].length;
      assert(
        length <= limit,
        `${kind}: segment ${index + 1} trop long (${length}/${limit})`,
      );
    });
    assert(
      segments[9].includes("Suite tronquée"),
      `${kind}: le dernier segment doit signaler la troncature`,
    );
  }
});

Deno.test("chooseOutboundChannel applique la préférence, la capacité et le repli SMS", () => {
  const channels = {
    sms_enabled: true,
    rcs_enabled: true,
    fallback_to_sms: true,
  };
  const reachable = {
    rcs_reachable: true,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const expired = {
    rcs_reachable: true,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  };

  assertEquals(chooseOutboundChannel("auto", channels, reachable), "rcs");
  assertEquals(chooseOutboundChannel("sms", channels, reachable), "sms");
  assertEquals(chooseOutboundChannel("auto", channels, expired), "sms");
  assertEquals(chooseOutboundChannel("rcs", channels, null), "sms");
  assertEquals(
    chooseOutboundChannel("rcs", { ...channels, fallback_to_sms: false }, null),
    null,
  );
  assertEquals(
    chooseOutboundChannel("auto", { ...channels, sms_enabled: false }, null),
    null,
  );
  assertEquals(
    chooseOutboundChannel(
      "sms",
      { ...channels, sms_enabled: false },
      reachable,
    ),
    null,
  );
});

Deno.test("ensureSmsPayload transforme le contenu riche lors du repli RCS vers SMS", () => {
  const rich: TelOutboundPayload = {
    schema: "waouh.tel.outbound.v1",
    text: "Voici une offre.",
    products: [{
      title: "Terrain",
      price: 5000000,
      photos: ["https://cdn.bot.bj/terrain.jpg"],
    }],
    actions: [{ label: "Voir", value: "1" }],
  };
  const sms = ensureSmsPayload(rich);
  assertEquals(sms.metadata, { rendered_for: "sms" });
  assert(sms.text.includes("1. Terrain"));
  assert(sms.text.includes("https://cdn.bot.bj/terrain.jpg"));
});

Deno.test("parseTelCommand reconnaît les commandes de consentement, aide et effacement", () => {
  assertEquals(parseTelCommand("STOP"), { type: "stop" });
  assertEquals(parseTelCommand("arrêt"), { type: "stop" });
  assertEquals(parseTelCommand("AIDE"), { type: "help" });
  assertEquals(parseTelCommand("REPRENDRE"), { type: "resume" });
  assertEquals(parseTelCommand("bonjour waouh"), { type: "resume" });
  assertEquals(parseTelCommand("EFFACER"), { type: "erase_request" });
  assertEquals(parseTelCommand("EFFACER CONFIRMER"), { type: "erase_confirm" });
  assertEquals(parseTelCommand("Je cherche une moto"), null);
});

Deno.test("reçu RCS Infobip SEEN avec seenAt marque la lecture", () => {
  const receipt = {
    messageId: "rcs-message-42",
    from: "WAOUH",
    to: "2290197123456",
    sentAt: "2026-09-24T07:00:00.000Z",
    seenAt: "2026-09-24T07:01:00.000Z",
  };
  assertEquals(receiptStatus(receipt), "read");
  assertEquals(receiptProviderStatus(receipt, "read"), "SEEN");
  assertEquals(receiptOccurredAt(receipt), "2026-09-24T07:01:00.000Z");
  assertEquals(nextMessageStatus("delivered", "read"), "read");
});

Deno.test("reçu livré utilise deliveredAt puis doneAt, statut inconnu ignoré", () => {
  const delivered = {
    messageId: "sms-message-42",
    status: { groupName: "DELIVERED", name: "DELIVERED_TO_HANDSET" },
    sentAt: "2026-09-24T07:00:00.000Z",
    doneAt: "2026-09-24T07:02:00.000Z",
  };
  assertEquals(receiptStatus(delivered), "delivered");
  assertEquals(receiptOccurredAt(delivered), "2026-09-24T07:02:00.000Z");
  assertEquals(
    receiptStatus({ messageId: "unknown", status: "UNKNOWN" }),
    null,
  );
  assertEquals(receiptStatus({ messageId: "unknown" }), null);
  assertEquals(receiptStatus({ status: { name: "ERROR" } }), "failed");
});

Deno.test("callbackData UUID rattache tous les segments SMS au même outbox", () => {
  const outboxId = "102dd87a-9f2c-4f1a-88e7-e9cd07ab6715";
  for (const messageId of ["segment-1", "segment-2", "segment-3"]) {
    assertEquals(
      receiptOutboxLookup({ callbackData: outboxId, messageId }),
      { column: "id", value: outboxId },
    );
  }
  assertEquals(
    receiptOutboxLookup({
      callbackData: "non-uuid",
      messageId: "legacy-message",
    }),
    { column: "provider_message_id", value: "legacy-message" },
  );
});

Deno.test("reçus tardifs ne régressent pas les messages livrés ou lus", () => {
  assertEquals(nextMessageStatus("read", "failed"), null);
  assertEquals(nextMessageStatus("delivered", "expired"), null);
  assertEquals(nextMessageStatus("read", "delivered"), null);
  assertEquals(nextMessageStatus("sent", "failed"), "failed");
});
