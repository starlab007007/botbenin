// Équivalence stricte avec les règles historiques de handleStatus (waouh-deal-ops).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkOperatorDealTransition,
  journeyStepFor,
  OPERATOR_DEAL_STATUSES,
} from "./waouh-commerce-states.ts";

// Référence figée : le code de handleStatus au 26/09/2026 (commit 8c909bae),
// conservé ici uniquement pour prouver que la nouvelle version ne change rien.
function legacyHandleStatusCheck(current: string | null, status: string): { status: number; body: unknown } | null {
  if (status === "picked_up" && current !== "assigned") {
    return { status: 409, body: { error: "invalid_deal_transition", expected: "assigned", current_status: current } };
  }
  if (status === "delivered" && current !== "picked_up") {
    return { status: 409, body: { error: "invalid_deal_transition", expected: "picked_up", current_status: current } };
  }
  if (status === "cancelled" && ["delivered", "completed"].includes(current as string)) {
    return { status: 409, body: { error: "delivered_deal_requires_dispute", current_status: current } };
  }
  return null;
}

const CURRENT = [
  null, "awaiting_confirmation", "pending_assignment", "assigned", "picked_up",
  "delivered", "completed", "cancelled", "delivery_pending",
];

for (const current of CURRENT) {
  for (const target of OPERATOR_DEAL_STATUSES) {
    Deno.test(`transition opérateur ${current} → ${target} identique à l'historique`, () => {
      const legacy = legacyHandleStatusCheck(current, target);
      const next = checkOperatorDealTransition(current, target);
      if (legacy === null) {
        assertEquals(next, { ok: true });
      } else {
        assertEquals(next, { ok: false, httpStatus: 409, body: legacy.body } as any);
      }
    });
  }
}

Deno.test("étapes du parcours", () => {
  assertEquals(journeyStepFor("proposed"), "negotiation");
  assertEquals(journeyStepFor("awaiting_confirmation"), "agreement");
  assertEquals(journeyStepFor("assigned"), "courier");
  assertEquals(journeyStepFor("completed"), "payment");
  assertEquals(journeyStepFor("inconnu"), null);
});
