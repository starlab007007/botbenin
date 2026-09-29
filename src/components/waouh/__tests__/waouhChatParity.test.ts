// Parité Web ⇄ Flutter : le Web fait foi. Les mêmes données de référence
// (docs/contracts/chat/parity-fixtures.json) sont rejouées côté Flutter
// (flutter_waouh_app/test/live_web_parity_chat_test.dart).
import { describe, expect, it } from "vitest";
import fixtures from "../../../../docs/contracts/chat/parity-fixtures.json";
import { correlationIdFor } from "../waouhCorrelation";
import { commerceRequestFromButton } from "@/lib/waouh/commerceAction";

describe("parité chat Web ⇄ Flutter (données de référence communes)", () => {
  it("correlation_id", () => {
    for (const c of fixtures.correlation) {
      expect(correlationIdFor(c.article, c.role as "buyer" | "seller", c.counterpart)).toBe(c.expected);
    }
  });

  it("boutons serveur → requête du contrat v3", () => {
    for (const c of fixtures.buttons.cases) {
      expect(commerceRequestFromButton(c.id, fixtures.buttons.scope)).toEqual(c.request);
    }
  });

  it("contre-offre / prix / question restent dans le composeur", () => {
    for (const id of fixtures.buttons.composerOnly) {
      expect(commerceRequestFromButton(id, fixtures.buttons.scope)).toBeNull();
    }
  });
});
