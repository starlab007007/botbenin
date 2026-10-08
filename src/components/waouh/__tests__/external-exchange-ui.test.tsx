import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { call } = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/lib/waouh/externalExchange", async () => ({
  ...(await vi.importActual("@/lib/waouh/externalExchange")),
  exchangeCall: call,
}));
import {
  WaouhExternalExchange,
  WaouhExternalExchangeDisclosure,
} from "../WaouhExternalExchange";
let root: Root;
let container: HTMLDivElement;
const snapshot = {
  journey: {
    id: "j",
    subject: "Ventilateur",
    mode: "buy",
    stage: "negotiating",
  },
  messages: [
    {
      id: "m",
      role: "counterparty",
      text: "Disponible à 25 000 FCFA",
      channel: "whatsapp",
      status: "received",
      created_at: "2026-10-08T12:00:00Z",
      operation: "message",
    },
  ],
  agreement: {
    id: "revision-2",
    terms: {
      amount: 25000,
      quantity: 1,
      currency: "XOF",
      delivery: "Cotonou",
      payment: "Après réception",
    },
    proposed_by: "counterparty",
    counterparty_accepted_at: "yes",
  },
  routes: [
    { channel: "guest", label: "Lien invité", available: true },
    { channel: "email", label: "E-mail", available: false },
  ],
};
beforeEach(() => {
  call.mockReset();
  call.mockResolvedValue(snapshot);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
it("closed disclosure makes no network request", async () => {
  await act(async () =>
    root.render(<WaouhExternalExchangeDisclosure journeyId="j" />),
  );
  expect(call).not.toHaveBeenCalled();
});
it("owner accepts the exact displayed revision and cannot duplicate the request", async () => {
  await act(async () =>
    root.render(<WaouhExternalExchange access={{ journey_id: "j" }} />),
  );
  expect(container.textContent).toContain("Disponible à 25 000 FCFA");
  expect(
    container.querySelector('option[value="email"]')?.hasAttribute("disabled"),
  ).toBe(true);
  let finish!: (value: unknown) => void;
  call.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const button = [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Accepter ces conditions"),
  )!;
  await act(async () => {
    button.click();
    button.click();
  });
  expect(call.mock.calls.filter((c) => c[1] === "accept")).toHaveLength(1);
  expect(call).toHaveBeenLastCalledWith(
    { journey_id: "j" },
    "accept",
    expect.objectContaining({
      agreement_id: "revision-2",
      request_id: expect.any(String),
    }),
  );
  await act(async () => finish(snapshot));
});
it("guest sees only guest controls and buyer cannot confirm payment received", async () => {
  call.mockResolvedValue({
    ...snapshot,
    agreement: {
      ...snapshot.agreement,
      owner_accepted_at: "yes",
      payment_reported_at: "yes",
    },
  });
  await act(async () =>
    root.render(<WaouhExternalExchange access={{ token: "private-token" }} />),
  );
  expect(container.textContent).not.toContain("Créer le lien");
  expect(container.querySelector("select")).toBeNull();
  expect(container.textContent).toContain("J’ai reçu le paiement"); // Guest is seller on a buy journey.
  await act(async () =>
    root.render(<WaouhExternalExchange access={{ journey_id: "j" }} />),
  );
  expect(container.textContent).not.toContain("J’ai reçu le paiement");
  expect(container.textContent).toContain("J’ai reçu le produit / service");
});
it("failed confirmation keeps the agreement open and displays an error", async () => {
  await act(async () =>
    root.render(<WaouhExternalExchange access={{ journey_id: "j" }} />),
  );
  call.mockRejectedValueOnce(new Error("agreement_changed"));
  const accept = [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Accepter ces conditions"),
  )!;
  await act(async () => accept.click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Action non confirmée",
  );
  expect(container.textContent).toContain("Proposition à confirmer");
});
