import { describe, expect, it } from "vitest";

import {
  primaryWaouhSmartAction,
  readWaouhSmartEnvelope,
  safeWaouhRoute,
  waouhSmartActions,
  waouhSmartRoute,
} from "../smartPayload";

describe("WAOUH smart payload", () => {
  it("lit le contrat v1 et respecte next_best_action", () => {
    const payload = {
      correlation_id: "corr_demo",
      smart: {
        schema: "waouh.smart.v1",
        domain: "commerce",
        intent: "offer_received",
        priority: "high",
        route: "/app/chat/waouh",
        next_best_action: "counter",
        actions: [
          { id: "accept", label: "Accepter", kind: "commerce", priority: 2 },
          { id: "counter", label: "Contre-proposer", kind: "commerce", priority: 1 },
        ],
      },
    };
    const smart = readWaouhSmartEnvelope(payload);
    expect(smart?.domain).toBe("commerce");
    expect(smart?.correlation_id).toBe("corr_demo");
    expect(primaryWaouhSmartAction(payload)?.id).toBe("counter");
    expect(waouhSmartActions(payload).map((action) => action.id)).toEqual([
      "counter",
      "accept",
    ]);
  });

  it("reste compatible avec un payload historique", () => {
    const payload = {
      intent: "avatar_nudge_due",
      target_route: "/app/missions",
      actions: [{ id: "open", label: "Voir la mission" }],
    };
    expect(readWaouhSmartEnvelope(payload)?.intent).toBe("avatar_nudge_due");
    expect(waouhSmartRoute(payload)).toBe("/app/missions");
  });

  it("refuse une route externe injectée", () => {
    expect(safeWaouhRoute("https://example.com")).toBeNull();
    expect(safeWaouhRoute("//example.com/app/chat")).toBeNull();
    expect(safeWaouhRoute("/app/stock")).toBe("/app/stock");
  });

  it("limite les actions visibles", () => {
    const payload = {
      smart: {
        schema: "waouh.smart.v1",
        domain: "stock",
        intent: "low_stock",
        priority: "high",
        route: "/app/stock",
        actions: Array.from({ length: 7 }, (_, index) => ({
          id: `a${index}`,
          label: `Action ${index}`,
          priority: index,
        })),
      },
    };
    expect(waouhSmartActions(payload, 3)).toHaveLength(3);
  });
});
