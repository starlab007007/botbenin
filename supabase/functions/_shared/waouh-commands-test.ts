// Tests du registre unique des commandes (code réellement exécuté).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buttonIdFromWahaPayload,
  buyerPaymentActions,
  findActionIdByLabel,
  isSellerAvailabilityText,
  looksLikeActionLabel,
  negotiationActions,
  parseActionPayload,
  parseDealCommand,
  sellerAvailabilityActions,
  sellerOfferDecisionActions,
} from "./waouh-commands.ts";

const NEG = "a1b2c3d4-0000-4000-8000-00000000abcd";
const DEAL = "0f9e8d7c-1111-4111-8111-111111111111";

Deno.test("chaque bouton généré est reconnu avec la bonne cible", () => {
  for (const action of [...negotiationActions(NEG), ...sellerOfferDecisionActions(NEG)]) {
    const parsed = parseActionPayload(action.id);
    assertEquals(parsed?.scope, "negotiation", action.id);
    assertEquals(parsed?.targetId, NEG, action.id);
  }
  for (const action of [...buyerPaymentActions(DEAL), ...sellerAvailabilityActions(DEAL)]) {
    const parsed = parseActionPayload(action.id);
    assertEquals(parsed?.scope, "deal", action.id);
    assertEquals(parsed?.targetId, DEAL, action.id);
  }
});

Deno.test("libellés identiques à la production du 27/09/2026", () => {
  assertEquals(negotiationActions(NEG).map((a) => a.label), ["✅ Accepter", "💬 Contre-proposer", "❌ Refuser"]);
  assertEquals(buyerPaymentActions(DEAL).map((a) => a.label), ["📱 Mobile Money à la livraison", "💵 Cash à la livraison", "❌ Annuler"]);
  assertEquals(sellerAvailabilityActions(DEAL).map((a) => a.label), ["✅ Article disponible", "❌ Indisponible"]);
  assertEquals(sellerOfferDecisionActions(NEG).map((a) => a.label), ["✅ Accepter le prix", "💬 Faire une contre-offre", "❌ Refuser"]);
});

// Tous les alias acceptés par l'ancien parseDealCommand de waouh-channel-in.
const LEGACY_DEAL_ALIASES: Array<[string, { action: string; method?: string }]> = [
  ["seller_confirm_available", { action: "seller_confirm" }],
  ["seller_confirm", { action: "seller_confirm" }],
  ["confirmer-disponibilite", { action: "seller_confirm" }],
  ["payment_preference_mobile", { action: "payment_preference", method: "mobile_money" }],
  ["payment_mobile", { action: "payment_preference", method: "mobile_money" }],
  ["payer-mobile", { action: "payment_preference", method: "mobile_money" }],
  ["payment_preference_cod", { action: "payment_preference", method: "cash" }],
  ["payment_delivery", { action: "payment_preference", method: "cash" }],
  ["paiement-livraison", { action: "payment_preference", method: "cash" }],
  ["confirm_payment_cash", { action: "payment", method: "cash" }],
  ["confirmer-paiement-cash", { action: "payment", method: "cash" }],
  ["confirm_payment_mobile", { action: "payment", method: "mobile_money" }],
  ["confirmer-paiement-mobile", { action: "payment", method: "mobile_money" }],
  ["cancel_deal", { action: "cancel" }],
  ["cancel", { action: "cancel" }],
  ["annuler", { action: "cancel" }],
];

for (const [alias, expected] of LEGACY_DEAL_ALIASES) {
  Deno.test(`parseDealCommand: alias historique ${alias} (bouton)`, () => {
    const cmd = parseDealCommand("libellé visible", { button_payload: `${alias}:${DEAL}` });
    assertEquals(cmd, { ...expected, dealId: DEAL } as any);
  });
  Deno.test(`parseDealCommand: alias historique ${alias} (commerce_action + deal_id)`, () => {
    const cmd = parseDealCommand("texte", { commerce_action: alias, deal_id: DEAL });
    assertEquals(cmd, { ...expected, dealId: DEAL } as any);
  });
}

Deno.test("parseDealCommand: le deal du bouton prime sur un meta.deal_id périmé", () => {
  const stale = "99999999-9999-4999-8999-999999999999";
  assertEquals(
    parseDealCommand("x", { button_payload: `annuler:${DEAL}`, deal_id: stale }),
    { action: "cancel", dealId: DEAL },
  );
});

Deno.test("parseDealCommand: commandes de négociation et textes libres ignorés", () => {
  assertEquals(parseDealCommand("x", { button_payload: `accepter:${NEG}`, deal_id: DEAL }), null);
  assertEquals(parseDealCommand("annuler", { deal_id: DEAL }), null);
  assertEquals(parseDealCommand("bonjour", {}), null);
  assertEquals(parseDealCommand(`payer-mobile:${DEAL}`, {}), { action: "payment_preference", dealId: DEAL, method: "mobile_money" });
});

Deno.test("WhatsApp : identifiant du bouton retrouvé quel que soit le moteur WAHA", () => {
  const id = `contre-proposition:${NEG}`;
  assertEquals(buttonIdFromWahaPayload({ body: "💬 Contre-proposer", selectedButtonId: id }), id);
  assertEquals(buttonIdFromWahaPayload({ _data: { selectedButtonId: id } }), id);
  assertEquals(buttonIdFromWahaPayload({ button: { id, text: "x" } }), id);
  assertEquals(buttonIdFromWahaPayload({ listResponse: { singleSelectReply: { selectedRowId: id } } }), id);
  assertEquals(buttonIdFromWahaPayload({ body: "bonjour" }), null);
  assertEquals(buttonIdFromWahaPayload({ selectedButtonId: "pas-un-bouton" }), null);
});

Deno.test("WhatsApp : bouton reçu par son seul libellé", () => {
  assertEquals(looksLikeActionLabel("💬 Contre-proposer"), true);
  assertEquals(looksLikeActionLabel("✅ Accepter le prix"), true);
  assertEquals(looksLikeActionLabel("📱 Mobile Money"), true);
  assertEquals(looksLikeActionLabel("je cherche une moto"), false);
  const recent = [
    [{ id: "noise", label: "Autre" }],
    buyerPaymentActions(DEAL),
    negotiationActions(NEG),
  ];
  assertEquals(findActionIdByLabel(recent, "💵 Cash à la livraison"), `paiement-livraison:${DEAL}`);
  assertEquals(findActionIdByLabel(recent, "💬 Contre-proposer"), `contre-proposition:${NEG}`);
  assertEquals(findActionIdByLabel(recent, "inconnu"), null);
});


Deno.test("confirmation naturelle vendeur : formes sûres reconnues", () => {
  for (const text of ["je confirme", "Je confirme la disponibilité", "article disponible", "disponible", "toujours disponible", "oui disponible"]) {
    assertEquals(isSellerAvailabilityText(text), true, text);
  }
  for (const text of ["est-ce disponible ?", "je confirme le paiement", "oui", "bonjour"]) {
    assertEquals(isSellerAvailabilityText(text), false, text);
  }
});
