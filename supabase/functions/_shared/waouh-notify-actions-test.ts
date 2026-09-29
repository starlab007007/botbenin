// E1 — les boutons de décision du vendeur doivent atteindre son message du fil et la file WhatsApp.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { actionsOrEmpty, optionalUuid, sanitizeActions } from "./waouh-notify-actions.ts";

const NEG = "7c1f6f0a-1b2c-4d3e-8f4a-5b6c7d8e9f01";

Deno.test("sanitizeActions garde les boutons {id,label} valides, dans l'ordre", () => {
  const actions = [
    { id: `accepter:${NEG}`, label: "Accepter 300 000 FCFA" },
    { id: `contre-proposition:${NEG}`, label: "Contre-offre" },
    { id: `refuser:${NEG}`, label: "Refuser" },
  ];
  assertEquals(sanitizeActions(actions), actions);
});

Deno.test("sanitizeActions écarte le non-tableau, les entrées incomplètes et les doublons", () => {
  assertEquals(sanitizeActions(undefined), []);
  assertEquals(sanitizeActions("accepter"), []);
  assertEquals(sanitizeActions({ id: "x", label: "y" }), []);
  assertEquals(
    sanitizeActions([null, 3, { id: "a" }, { label: "b" }, { id: "  ", label: "vide" }, { id: "ok", label: "Oui" }, { id: "ok", label: "Doublon" }]),
    [{ id: "ok", label: "Oui" }],
  );
});

Deno.test("sanitizeActions borne le nombre et la longueur", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, label: `Bouton ${i}` }));
  assertEquals(sanitizeActions(many).length, 5);
  const long = sanitizeActions([{ id: "x".repeat(400), label: "y".repeat(400) }]);
  assertEquals(long[0].id.length, 120);
  assertEquals(long[0].label.length, 60);
});

Deno.test("actionsOrEmpty : les boutons de l'appelant ne sont plus écrasés par []", () => {
  const extra = { article_id: "a", actions: [{ id: `accepter:${NEG}`, label: "Accepter" }] };
  assertEquals(actionsOrEmpty(extra), [{ id: `accepter:${NEG}`, label: "Accepter" }]);
  assertEquals(actionsOrEmpty({ article_id: "a" }), []);
  assertEquals(actionsOrEmpty(null), []);
});

Deno.test("optionalUuid n'accepte que des uuid (pas de valeur libre dans les clés)", () => {
  assertEquals(optionalUuid(NEG), NEG);
  assertEquals(optionalUuid(` ${NEG.toUpperCase()} `), NEG);
  assertEquals(optionalUuid("pas-un-uuid"), null);
  assertEquals(optionalUuid(`${NEG},user_id.neq.0`), null);
  assertEquals(optionalUuid(undefined), null);
});
