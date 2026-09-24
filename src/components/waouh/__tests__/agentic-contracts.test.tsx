import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { normalizeChatReply, serializeChatReply } from "@/lib/chatReply";
import {
  approvalDecisionPayload, listFromAgenticData, normalizeAgenticBlocks, normalizeWaouhProductV1,
  unwrapAgenticEnvelope, WAOUH_MESSAGE_SCHEMA, WAOUH_PRODUCT_SCHEMA,
} from "@/lib/waouh/agenticContracts";
import { WaouhAgentBlocks } from "../WaouhAgentBlocks";

const mission = {
  id: "mission-1",
  title: "Trouver une moto Bajaj",
  status: "searching",
  progress: 42,
  budget_max_amount: 450000,
  currency: "XOF",
  steps: [{ id: "step-1", label: "Comparer les annonces", status: "running" }],
};

describe("contrats agentiques WAOUH v1", () => {
  it("conserve les blocs v1 après sauvegarde et rechargement de l’historique", () => {
    const payload = {
      schema: WAOUH_MESSAGE_SCHEMA,
      text: "La recherche continue.",
      blocks: [{ type: "mission_status", mission }],
    };
    const first = normalizeChatReply(payload);
    expect(first.blocks).toHaveLength(1);
    const restored = normalizeChatReply(serializeChatReply(payload));
    expect(restored.text).toBe("La recherche continue.");
    expect(restored.blocks[0]).toMatchObject({ type: "mission_status", mission: { id: "mission-1", progress: 42 } });
  });

  it("utilise les produits intégrés à un bloc carrousel", () => {
    const reply = normalizeChatReply({
      schema: WAOUH_MESSAGE_SCHEMA,
      blocks: [{ type: "product_carousel", items: [{ id: "p1", title: "Moto", price: 400000, photos: ["/moto.webp"] }] }],
    });
    expect(reply.results[0]).toMatchObject({ id: "p1", title: "Moto", price: 400000, photos: ["/moto.webp"] });
  });

  it("normalise waouh.product.v1 et le rend compatible avec les cartes historiques", () => {
    const product = normalizeWaouhProductV1({
      schema: WAOUH_PRODUCT_SCHEMA,
      product_id: "product-1",
      title: "Moto Bajaj",
      price_amount: 425000,
      currency: "XOF",
      photos: [{ url: "/bajaj.webp" }, "javascript:alert(1)"],
      city: "Cotonou",
    });
    expect(product).toMatchObject({ schema: WAOUH_PRODUCT_SCHEMA, product_id: "product-1", price_amount: 425000, photos: ["/bajaj.webp"] });
    expect(normalizeChatReply({ products: [product] }).results[0]).toMatchObject({ id: "product-1", title: "Moto Bajaj", price: 425000, photos: ["/bajaj.webp"] });
  });

  it("exclut strictement les approbations financières de cette interface", () => {
    const blocks = normalizeAgenticBlocks([
      { type: "approval", approval: { id: "safe", title: "Consulter ce catalogue", action_type: "catalog.search", status: "pending" } },
      { type: "approval", approval: { id: "money", title: "Payer", action_type: "payment.execute", status: "pending", is_financial: true } },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "approval", approval: { id: "safe", is_financial: false } });
  });

  it("ignore les blocs inconnus et les entités incomplètes", () => {
    expect(normalizeAgenticBlocks([{ type: "secret_tool", data: { token: "x" } }, { type: "mission", mission: { title: "Sans identifiant" } }])).toEqual([]);
  });

  it("déplie les réponses API et propage leur message d’erreur", () => {
    expect(unwrapAgenticEnvelope<{ mission: { id: string } }>({ ok: true, data: { mission: { id: "m1" } } }).mission.id).toBe("m1");
    expect(() => unwrapAgenticEnvelope({ ok: false, error: { code: "forbidden", message: "Accès refusé" } })).toThrow("Accès refusé");
  });

  it("accepte les listes sous leur clé métier versionnée", () => {
    expect(listFromAgenticData<{ id: string }>({ missions: [{ id: "m1" }], next_cursor: null }, "missions")).toEqual([{ id: "m1" }]);
    expect(listFromAgenticData<{ id: string }>({ activities: [{ id: "a1" }] }, "activities", "entries")).toEqual([{ id: "a1" }]);
  });

  it("normalise exactement les champs renvoyés par le backend agentique", () => {
    const blocks = normalizeAgenticBlocks([
      { type: "mission_status", mission: { id: "m2", goal: "Chercher un frigo", status: "active" } },
      { type: "watch_status", watch: { id: "w2", query: "Frigo", status: "active", target_amount: 100000, last_observed_amount: 120000 } },
      { type: "seller_offer", offer: { id: "o2", amount: 95000, currency: "XOF", status: "proposed" } },
    ]);
    expect(blocks[0]).toMatchObject({ mission: { title: "Chercher un frigo", status: "active" } });
    expect(blocks[1]).toMatchObject({ watch: { current_amount: 120000 } });
    expect(blocks[2]).toMatchObject({ offer: { unit_price_amount: 95000, status: "proposed" } });
  });

  it("envoie les décisions d’approbation avec les valeurs strictes du backend", () => {
    expect(approvalDecisionPayload("approval-1", "approved")).toEqual({ approval_id: "approval-1", decision: "approved" });
    expect(approvalDecisionPayload("approval-1", "rejected")).toEqual({ approval_id: "approval-1", decision: "rejected" });
  });
});

describe("cartes agentiques WAOUH", () => {
  it("rend une mission, sa progression et ses contrôles", () => {
    const blocks = normalizeAgenticBlocks([{ type: "mission_status", mission }]);
    const html = renderToStaticMarkup(<WaouhAgentBlocks blocks={blocks} onAction={() => undefined} />);
    expect(html).toContain("Trouver une moto Bajaj");
    expect(html).toContain("450\u202f000");
    expect(html).toContain("Comparer les annonces");
    expect(html).toContain("Pause");
  });

  it("rend une veille et une offre sans exposer d’action de paiement", () => {
    const blocks = normalizeAgenticBlocks([
      { type: "watch_status", watch: { id: "w1", title: "Moto Bajaj", status: "active", target_amount: 430000, current_amount: 460000 } },
      { type: "seller_offer", offer: { id: "o1", title: "Offre de Calavi", unit_price_amount: 425000, delivery_fee_amount: 5000, status: "sent" } },
    ]);
    const html = renderToStaticMarkup(<WaouhAgentBlocks blocks={blocks} onAction={() => undefined} />);
    expect(html).toContain("Prix observé");
    expect(html).toContain("Offre de Calavi");
    expect(html).toContain("Accepter");
    expect(html.toLowerCase()).not.toContain("payer");
  });
});
