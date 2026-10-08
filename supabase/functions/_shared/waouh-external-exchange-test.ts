import {
  assert,
  assertEquals,
  assertThrows,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  exchangeTerms,
  exchangeUuid,
  exchangeText,
  handleExternalExchange,
  isExternalExchangeAction,
} from "./waouh-external-exchange.ts";
import { wahaReceiptStatus } from "./waouh-external-receipt.ts";
Deno.test(
  "external agreements validate amount, quantity and explicit conditions",
  () => {
    const terms = {
      amount: 20000,
      quantity: 1,
      delivery: "Cotonou",
      payment: "Après réception",
    };
    assertEquals(exchangeTerms({ ...terms, private_owner: "secret" }), {
      ...terms,
      currency: "XOF",
    });
    for (const patch of [
      { amount: 0 },
      { amount: NaN },
      { amount: "20000" },
      { quantity: 1.5 },
      { quantity: 0 },
      { delivery: "" },
      { payment: "" },
    ])
      assertThrows(() => exchangeTerms({ ...terms, ...patch }));
  },
);
Deno.test(
  "exchange references and messages reject malformed or oversized input",
  () => {
    assertThrows(() => exchangeUuid("another-owner"));
    assertThrows(() => exchangeText(" "));
    assertThrows(() => exchangeText("x".repeat(2001)));
    assertEquals(exchangeText(" Bonjour "), "Bonjour");
  },
);
Deno.test("WhatsApp receipts distinguish accepted, delivered and read", () => {
  assertEquals(wahaReceiptStatus({ ack: 0 }), null);
  assertEquals(wahaReceiptStatus({ ack: 1 }), "sent");
  assertEquals(wahaReceiptStatus({ ack: 2 }), "delivered");
  assertEquals(wahaReceiptStatus({ ack: 3 }), "read");
  assertEquals(wahaReceiptStatus({ ack: -1 }), "failed");
});
Deno.test(
  "exchange declarations allow no money execution or arbitrary tools",
  () => {
    assertEquals(isExternalExchangeAction("nexus.guest.payment"), true);
    assertEquals(isExternalExchangeAction("nexus.external.propose"), true);
    for (const action of [
      "payment.execute",
      "nexus.external.payment.execute",
      "nexus.guest.invite",
      "nexus.external.refund",
      "nexus.guest.transfer",
    ])
      assertEquals(isExternalExchangeAction(action), false);
  },
);
Deno.test(
  "owner requests cannot enter without owner authentication",
  async () => {
    await assertRejects(
      () => handleExternalExchange({}, "nexus.external.read", {}),
      Error,
      "authentication_required",
    );
  },
);
Deno.test(
  "guest scope comes exclusively from the verified invite, never client journey or role",
  async () => {
    const journeyId = "11111111-1111-4111-8111-111111111111";
    const inviteId = "22222222-2222-4222-8222-222222222222";
    const requests: any[] = [];
    let mutation: any;
    const sb = {
      from(table: string) {
        const filters: any[] = [];
        requests.push({ table, filters });
        const result = () => ({
          error: null,
          data:
            table === "waouh_external_invites"
              ? { id: inviteId, journey_id: journeyId }
              : table === "waouh_opportunity_journeys"
                ? {
                    id: journeyId,
                    owner_id: "private-owner",
                    fabric_id: "external:signal",
                    subject: "Ventilateur",
                    mode: "buy",
                    stage: "waiting_reply",
                    metadata: { private: "secret" },
                  }
                : table === "waouh_external_agreements" ||
                    table === "waouh_users"
                  ? null
                  : [],
        });
        const q: any = {
          then(resolve: any) {
            return Promise.resolve(result()).then(resolve);
          },
          maybeSingle() {
            return Promise.resolve(result());
          },
          single() {
            return Promise.resolve(result());
          },
        };
        for (const method of [
          "select",
          "eq",
          "gt",
          "is",
          "in",
          "order",
          "limit",
        ])
          q[method] = (...args: any[]) => {
            filters.push([method, ...args]);
            return q;
          };
        return q;
      },
      rpc(_name: string, params: any) {
        mutation = params;
        return Promise.resolve({ data: {}, error: null });
      },
    };
    const result = await handleExternalExchange(sb, "nexus.guest.message", {
      token: "a".repeat(64),
      journey_id: "forged-journey",
      role: "owner",
      request_id: "33333333-3333-4333-8333-333333333333",
      text: "Disponible",
    });
    assertEquals(mutation.p_journey_id, journeyId);
    assertEquals(mutation.p_role, "counterparty");
    assertEquals(mutation.p_invite_id, inviteId);
    assert("journey" in result);
    assertEquals(result.journey.id, journeyId);
    assertEquals(
      (result.journey as Record<string, unknown>).owner_id,
      undefined,
    );
    assertEquals(
      (result.journey as Record<string, unknown>).metadata,
      undefined,
    );
    assertEquals(JSON.stringify(requests).includes("forged-journey"), false);
    for (const request of requests.filter((r) =>
      [
        "waouh_conversation_bus_events",
        "waouh_outbound_queue",
        "waouh_tel_outbox",
      ].includes(r.table),
    ))
      assertEquals(
        request.filters.some((f: any) => f[0] === "eq" && f[2] === journeyId),
        true,
      );
  },
);
