import { expect, it, vi } from "vitest";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("../agenticClient", () => ({ invokeWaouhAgentic: invoke }));
import {
  exchangeCall,
  exchangeDeliveryLabel,
  exchangeNextStep,
  type ExchangeSnapshot,
} from "../externalExchange";
it("guest and owner requests use separate access paths without overriding the access scope", async () => {
  await exchangeCall({ token: "secret" }, "message", {
    journey_id: "forged",
    token: "forged",
    text: "Bonjour",
  });
  expect(invoke).toHaveBeenLastCalledWith(
    "nexus.guest.message",
    expect.objectContaining({ token: "secret" }),
  );
  await exchangeCall({ journey_id: "own" }, "read", { journey_id: "other" });
  expect(invoke).toHaveBeenLastCalledWith("nexus.external.read", {
    journey_id: "own",
  });
});
it("queued and provider-accepted messages never appear delivered", () => {
  expect(exchangeDeliveryLabel("pending")).toBe("En attente d’envoi");
  expect(exchangeDeliveryLabel("accepted")).toBe("Accepté par le fournisseur");
  expect(exchangeDeliveryLabel("delivered")).toBe("Livré");
  expect(exchangeDeliveryLabel("simulation")).toContain("aucun envoi réel");
});
it("completion requires both receipt and payment received", () => {
  const snapshot = {
    journey: { stage: "executing" },
    agreement: {
      owner_accepted_at: "yes",
      counterparty_accepted_at: "yes",
      payment_reported_at: "yes",
      payment_received_at: "yes",
    },
  } as ExchangeSnapshot;
  expect(exchangeNextStep(snapshot)).toContain("réception");
  snapshot.agreement!.received_at = "yes";
  snapshot.agreement!.payment_received_at = undefined;
  expect(exchangeNextStep(snapshot)).toContain("vendeur");
});
