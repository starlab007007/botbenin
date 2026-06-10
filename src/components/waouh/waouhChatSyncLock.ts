/**
 * WAOUH Chat Sync Flow — LOCKED v1 (snapshot 2026-06-06)
 *
 * Référence mémoire : mem://features/waouh-chat-sync-flow
 *
 * Ce module sert de **sentinelle runtime** et de source canonique des
 * invariants verrouillés du flux chat acheteur/vendeur WAOUH.
 *
 * Toute modification du flux (NEGOTIATE webhook, negotiation-router,
 * WaouhMatchChatWindow) DOIT préserver les règles décrites ici, sinon
 * le test `waouh-chat-sync-flow.lock.test.ts` échoue.
 *
 * En dev, lors du montage d'une WaouhMatchChatWindow, on pose un
 * verrou global `window.__WAOUH_CHAT_SYNC_LOCK__` qui empêche tout
 * code externe de muter ces invariants pendant le cycle de vie de la
 * fenêtre. Le verrou est purement informationnel (Object.freeze) — il
 * documente l'état figé sans bloquer l'exécution normale.
 */

export const WAOUH_CHAT_SYNC_LOCK = Object.freeze({
  version: "v12",
  lockedAt: "2026-06-10T18:00:00.000Z",
  memoryRef: "mem://features/waouh-chat-sync-flow",

  invariants: Object.freeze({
    webhook: {
      file: "supabase/functions/waouh-webhook/index.ts",
      mustContain: [
        "async function pushToOther",
        "article_id: articleIdCol",
        "directMeta",
      ],
    },
    router: {
      file: "supabase/functions/waouh-negotiation-router/index.ts",
      mustContain: [
        "async function pushToOther",
        "article_id: articleIdCol",
        "article_id: neg.article_id",
        "intent: \"deal_created\"",
        "intent: \"negotiation_closed\"",
        "intent: \"negotiation_open\"",
      ],
    },
    chatWindow: {
      file: "src/components/waouh/WaouhMatchChatWindow.tsx",
      mustContain: [
        "m?.article_id !== match.article_id && m?.meta?.article_id !== match.article_id",
        "const seedText = seedNotif?.text?.trim()",
        "authUserId: authUserId ?? null",
      ],
      mustNotContain: [
        "{seedNotif?.text}",
        "{seedNotif.text}",
        // v9 — la fenêtre match DOIT propager authUserId à waouh-channel-in
        // pour que le sibling resolver retrouve la négo App.
        "authUserId: null,",
      ],
    },
    // 🆕 v2 — Verrouille le flux 100 % WhatsApp (vendeur ↔ acheteur).
    // Toute régression sur la résolution LID casse les notifications
    // "📩 Nouvel acheteur intéressé", les contre-offres et l'accord final.
    whatsappLidResolution: {
      file: "supabase/functions/waouh-channel-in/index.ts",
      mustContain: [
        "lidToPhoneInline",
        "lid resolved",
      ],
    },
    whatsappOutboundDispatch: {
      file: "supabase/functions/waouh-outbound-dispatch/index.ts",
      mustContain: [
        "lidToPhoneInline",
        "@lid",
      ],
    },
    // 🆕 v3 — Tunnel partenaire (catalog → article) & fallback radar IA.
    partnerCatalogPromotion: {
      file: "supabase/functions/_shared/waouh-promote.ts",
      mustContain: [
        "promoteCatalogToArticle",
        "promoted_article_id",
      ],
    },
    notifyDispatchAcceptsCatalog: {
      file: "supabase/functions/waouh-notify-dispatch/index.ts",
      mustContain: [
        "catalog_id",
        "promoteCatalogToArticle",
      ],
    },
    radarContactFallback: {
      file: "supabase/functions/_shared/waouhContact.ts",
      mustContain: [
        "needs_enrichment",
        "waouh_external_listings",
      ],
    },
    e2eRunnerCoverage: {
      file: "supabase/functions/waouh-e2e-test/index.ts",
      mustContain: [
        "runCell",
        "scenarios",
        "waouh_e2e_test_runs",
      ],
    },
    // 🔒 v4 — Idempotence du flux WhatsApp 100 % (acceptation + queue).
    // Verrouille la non-duplication de "vente conclue" / "achat confirmé".
    whatsappAcceptanceIdempotence: {
      file: "supabase/functions/waouh-negotiation-router/index.ts",
      mustContain: [
        "deal_already_accepted",
        "suppress_direct_reply",
        "23505",
      ],
    },
    whatsappChannelInSuppress: {
      file: "supabase/functions/waouh-channel-in/index.ts",
      mustContain: [
        "suppress_direct_reply",
      ],
    },
    whatsappQueueDedup: {
      file: "supabase/functions/_shared/waouh-sync.ts",
      mustContain: [
        "${dealId ?? \"nodeal\"}",
      ],
    },
    // 🔒 v5 — Parcours B (Vendeur App + Acheteur WA) et C (Vendeur WA + Acheteur App)
    // alignés sur A. Les utilisateurs App reçoivent les notifs en miroir dans
    // WaouhMatchChatWindow grâce à pushSyncedEvent (canal "app").
    appChannelInSyncedEvent: {
      file: "supabase/functions/_shared/waouh-sync.ts",
      mustContain: [
        "auth_user_id ? \"app\"",
      ],
    },
    appNotifyDispatchMirror: {
      file: "supabase/functions/waouh-notify-dispatch/index.ts",
      mustContain: [
        "pushSyncedEvent",
        "App-only target",
      ],
    },
    appRouterChannel: {
      file: "supabase/functions/waouh-negotiation-router/index.ts",
      mustContain: [
        "target.auth_user_id ? \"app\"",
      ],
    },
    e2eScenariosBC: {
      file: "supabase/functions/waouh-e2e-test/index.ts",
      mustContain: [
        "scenarios: Scenario[]",
        "sellerIsApp",
        "buyerIsApp",
      ],
    },
    // 🔒 v6 — Bug fixes scénarios B/C en situation réelle :
    // - Bug 1 : doublons "📩 Nouvel acheteur intéressé" côté vendeur
    //   (resolveVendorContacts dédupe par identité, pas seulement par numéro).
    // - Bug 2 : "Aucune négociation en cours" quand acheteur propose un prix
    //   sur un article partner (promotion catalog→article AVANT l'insert
    //   waouh_negotiations dans le flow CONFIRM/BUY_INTEREST).
    webhookPromotesCatalogBeforeNegotiation: {
      file: "supabase/functions/waouh-webhook/index.ts",
      mustContain: [
        "promoteCatalogToArticle",
        "Bug 2 fix",
        "pickSource === \"partner\"",
      ],
    },
    vendorContactsSingleRecipient: {
      file: "supabase/functions/waouh-webhook/index.ts",
      mustContain: [
        "Bug 1 fix",
        "seenUserKey",
        "auth_user_id",
      ],
    },
    // 🔒 v7 — Contre-offre vendeur multi-identités (App + WA, LID + phone).
    // Sans ces fallbacks la contre-offre du vendeur tombe sur
    // "Aucune négociation en cours" car waouh_users diffère.
    channelInUsesSiblingIds: {
      file: "supabase/functions/waouh-channel-in/index.ts",
      mustContain: [
        "resolveSiblingUserIds",
        "siblingOrFilter",
      ],
    },
    routerUsesSiblingIds: {
      file: "supabase/functions/waouh-negotiation-router/index.ts",
      mustContain: [
        "resolveSiblingUserIds",
        "siblingIds.includes(neg.buyer_user_id)",
      ],
    },
    // 🔒 v8 — Quand WAHA envoie au vrai vendeur mais livre via un LID,
    // l'inbound LID doit se rattacher au `to_user_id` de la queue livrée.
    // Sinon la réponse vendeur repart vers le core et renvoie "Aucune négociation".
    identityUsesDeliveredLidQueue: {
      file: "supabase/functions/_shared/waouh-identity.ts",
      mustContain: [
        "waouh_outbound_queue",
        "delivered via",
        "to_user_id",
      ],
    },
    // 🔒 v10 — Radar IA → Scénario B opérationnel.
    // L'acheteur scrapé par Radar IA qui répond "OUI" au template
    // `radar_buyer_outreach` doit ouvrir une négociation avec le vendeur App.
    radarBuyerHydration: {
      file: "supabase/functions/waouh-webhook/index.ts",
      mustContain: [
        "findRadarOutreachContext",
        "radar_buyer_context",
        "[radar-buyer-hydrate]",
      ],
    },
    radarHelperShared: {
      file: "supabase/functions/_shared/waouh-radar.ts",
      mustContain: [
        "findRadarOutreachContext",
        "radar_buyer_outreach",
        // v11 — helper miroir vendeur WA Radar IA
        "findRadarSellerOutreachContext",
        "radar_seller_outreach",
      ],
    },
    // 🔒 v11 — Radar IA → Scénario B miroir (App buyer ↔ WA seller).
    // L'annonce SELL scrapée doit ouvrir une négociation côté acheteur App,
    // et la réponse "OUI" / "Je propose X" du vendeur WA scrapé doit
    // retrouver l'article promu (hydratation symétrique au v10).
    radarSellerHydration: {
      file: "supabase/functions/waouh-webhook/index.ts",
      mustContain: [
        "findRadarSellerOutreachContext",
        "radar_seller_context",
        "[radar-seller-hydrate]",
        "radarPromotedArticles",
      ],
    },
  }),
});


declare global {
  // eslint-disable-next-line no-var
  var __WAOUH_CHAT_SYNC_LOCK__: typeof WAOUH_CHAT_SYNC_LOCK | undefined;
}

/**
 * Pose le verrou global. Idempotent. À appeler au montage de la
 * WaouhMatchChatWindow. Émet un avertissement console si un autre
 * verrou (potentiellement modifié) est déjà présent.
 */
export function engageWaouhChatSyncLock(): void {
  if (typeof window === "undefined") return;
  const existing = (window as any).__WAOUH_CHAT_SYNC_LOCK__;
  if (!existing) {
    (window as any).__WAOUH_CHAT_SYNC_LOCK__ = WAOUH_CHAT_SYNC_LOCK;
    return;
  }
  if (existing.version !== WAOUH_CHAT_SYNC_LOCK.version) {
    // eslint-disable-next-line no-console
    console.warn(
      "[WAOUH-LOCK] Version mismatch detected — flow may have been modified.",
      { existing: existing.version, expected: WAOUH_CHAT_SYNC_LOCK.version }
    );
  }
}
