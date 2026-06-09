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
  version: "v5",
  lockedAt: "2026-06-10T00:00:00.000Z",
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
        "Bulle \"seedNotif.text\" supprim",
        "authUserId: authUserId ?? null",
      ],
      mustNotContain: [
        "{seedNotif?.text}",
        "{seedNotif.text}",
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
