// Tests du catalogue unifié : forme courte garantie pour CHAQUE message.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type CatalogKey,
  clampActions,
  DETAIL_MAX_CHARS,
  fcfa,
  renderCatalog,
  stageFor,
  TITLE_MAX_WORDS,
} from "./waouh-message-catalog.ts";
import {
  articleEntryActionsV3,
  looksLikeActionLabel,
  negotiationActionsV3,
  parseActionPayload,
} from "./waouh-commands.ts";

const ALL_KEYS: CatalogKey[] = [
  "deal_opened", "deal_already_open", "request_sent", "new_buyer", "question_prompt", "question_sent",
  "question_received", "offer_sent", "offer_received", "awaiting_counterparty", "counter_prompt",
  "agreement", "offer_refused_actor", "offer_refused_other", "seller_confirmed", "pay_mode_chosen",
  "courier_assigned", "picked_up", "delivered", "payment_confirmed", "deal_cancelled", "no_open_deal",
  "multiple_open_deals", "stale_button", "out_of_stage", "technical_error", "article_reserved",
  "negotiation_paused", "not_understood", "confirm_money_action", "self_article", "results_found",
];

const LONG_TITLE = "Téléphone Samsung Galaxy A54 5G 256 Go noir, très bon état avec facture et chargeur";
const EMOJI_RE = /\p{Extended_Pictographic}/u;

Deno.test("chaque message : titre ≤ 5 mots, détail ≤ 90 caractères, sans emoji", () => {
  for (const key of ALL_KEYS) {
    for (const role of ["buyer", "seller"] as const) {
      const m = renderCatalog(key, {
        title: LONG_TITLE, amount: 1_250_000, previous: 1_400_000, price: 1_500_000, suggested: 1_325_000,
        role, etaMinutes: 25, responseMinutes: 12, method: "cash", count: 12,
        question: "Est-ce que le téléphone est encore sous garantie et débloqué tout opérateur ?",
        label: "Accepter l'offre",
      });
      assert(m.title.split(/\s+/).length <= TITLE_MAX_WORDS, `${key}: ${m.title}`);
      assert(m.detail.length <= DETAIL_MAX_CHARS, `${key} (${m.detail.length}) : ${m.detail}`);
      assert(!EMOJI_RE.test(m.text), `${key} contient un emoji`);
      assertEquals(m.text, `*${m.title}*\n${m.detail}`);
    }
  }
});

Deno.test("montants au format « 2 450 FCFA »", () => {
  assertEquals(fcfa(2450).replace(/ /g, " "), "2 450 FCFA");
  assertEquals(fcfa(1250000).replace(/ /g, " "), "1 250 000 FCFA");
  assertEquals(fcfa(null), "0 FCFA");
});

Deno.test("capture 2 : réponse courte au lieu du texte figé", () => {
  const m = renderCatalog("deal_already_open", { title: "Chaussures de sport", amount: 2450 });
  assertEquals(m.title, "Discussion déjà ouverte");
  assert(m.detail.includes("Chaussures de sport"));
});

Deno.test("délai de réponse affiché seulement s'il est calculé", () => {
  assert(!renderCatalog("deal_opened", { title: "X", amount: 1000 }).detail.includes("min"));
  assert(renderCatalog("deal_opened", { title: "X", amount: 1000, responseMinutes: 12 }).detail.includes("12 min"));
});

Deno.test("3 boutons au maximum, ids uniques", () => {
  const actions = clampActions([
    { id: "a:1", label: "A" }, { id: "a:1", label: "A bis" }, { id: "b:1", label: "B" },
    { id: "c:1", label: "C" }, { id: "d:1", label: "D" }, { id: "", label: "vide" },
  ]);
  assertEquals(actions.map((a) => a.id), ["a:1", "b:1", "c:1"]);
});

Deno.test("boutons v3 : mêmes identifiants que le registre historique", () => {
  const NEG = "a1b2c3d4-0000-4000-8000-00000000abcd";
  const ART = "3f2c1b0a-0000-4000-8000-00000000a001";
  assertEquals(negotiationActionsV3(NEG).map((a) => parseActionPayload(a.id)?.kind), ["accept", "counter", "reject"]);
  assertEquals(negotiationActionsV3(NEG, { acceptFirst: false }).map((a) => parseActionPayload(a.id)?.kind), ["counter", "accept", "reject"]);
  const entry = articleEntryActionsV3(ART, 2450);
  assertEquals(entry.map((a) => parseActionPayload(a.id)?.kind), ["open_deal", "offer_prompt", "ask"]);
  assertEquals(entry.map((a) => parseActionPayload(a.id)?.scope), ["article", "article", "article"]);
  assertEquals(entry[0].label.replace(/ /g, " "), "Je le veux à 2 450 FCFA");
});

Deno.test("libellés v3 reconnus quand WhatsApp ne renvoie que le texte", () => {
  for (const label of ["Je le veux", "Je le veux à 2 450 FCFA", "Accepter 12 000 FCFA", "Contre-offre", "Mobile Money", "Cash", "Proposer un prix"]) {
    assertEquals(looksLikeActionLabel(label), true, label);
  }
  assertEquals(looksLikeActionLabel("je cherche un frigo"), false);
});

Deno.test("étape du parcours à partir des états stockés", () => {
  assertEquals(stageFor({}), "interest");
  assertEquals(stageFor({ negotiationState: "countered" }), "negotiation");
  assertEquals(stageFor({ negotiationState: "accepted" }), "agreement");
  assertEquals(stageFor({ dealStatus: "awaiting_confirmation" }), "agreement");
  assertEquals(stageFor({ dealStatus: "pending_assignment" }), "preparation");
  assertEquals(stageFor({ dealStatus: "picked_up" }), "courier");
  assertEquals(stageFor({ dealStatus: "delivered" }), "delivery");
  assertEquals(stageFor({ dealStatus: "completed" }), "payment");
});
